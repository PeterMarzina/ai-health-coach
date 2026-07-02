// src/lib/supabase.js — verbinding met de backend (Supabase)
// De sessie (met tokens) wordt versleuteld bewaard: de AES-sleutel staat in de
// beveiligde opslag van het toestel (SecureStore/Keychain), de versleutelde data
// in AsyncStorage. Dit is het officiële Supabase-patroon voor Expo, omdat een
// sessie te groot kan zijn voor SecureStore zelf.
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import aesjs from 'aes-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (__DEV__) {
  console.log('Supabase config:', supabaseUrl ? 'URL ok' : 'URL MISSING', supabaseAnonKey ? 'key ok' : 'key MISSING');
}

// Versleutelde opslag: AES-256-CTR met een per-item sleutel in SecureStore.
// Pas op met "optimalisaties" hier — dit volgt bewust exact het Supabase-voorbeeld.
class LargeSecureStore {
  async _encrypt(key, value) {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  async _decrypt(key, value) {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) return encryptionKeyHex;
    const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(encryptionKeyHex), new aesjs.Counter(1));
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key) {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return encrypted;
    return this._decrypt(key, encrypted);
  }

  async removeItem(key) {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }

  async setItem(key, value) {
    const encrypted = await this._encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage:
        Platform.OS === 'web'
          ? undefined
          : new LargeSecureStore(),

      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

// Token-verversing koppelen aan de app-status: alleen verversen als de app
// op de voorgrond staat, zodat de sessie niet stilletjes verloopt.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
