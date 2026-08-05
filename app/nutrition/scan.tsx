// app/nutrition/scan.tsx — barcodescanner (Fase 2)
// Permissieflow: uitleg vóór de prompt, en een herstelpad naar de systeeminstellingen
// bij een permanente weigering (canAskAgain === false) — nooit een dead end.
// Na een geldige scan: lock (ref, synchroon) + haptic feedback, dan lookup via de
// 'product-lookup' Edge Function. Gevonden → productdetail (portie + opslaan).
// Niet gevonden → handmatige invoer met de barcode al ingevuld.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Animated, Easing, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/components/store';
import type { MealType } from '@/src/types/tracking';
import { lookupProductByBarcode } from '@/src/services/trackingService';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;
const WINDOW_SIZE = 250;

export default function ScanScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date: string; mealType: MealType }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [explained, setExplained] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const scanLine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(scanLine, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanLine]);

  const goManual = useCallback((barcode?: string) => {
    router.replace({ pathname: '/nutrition/product/new', params: { date: params.date, mealType: params.mealType, barcode: barcode ?? '' } });
  }, [params.date, params.mealType]);

  const handleScanned = useCallback(async (result: BarcodeScanningResult) => {
    if (locked.current) return;
    locked.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBusy(true);
    try {
      const { product } = await lookupProductByBarcode(result.data);
      if (product) {
        router.replace({ pathname: '/nutrition/product/[id]', params: { id: product.id, product: JSON.stringify(product), date: params.date, mealType: params.mealType } });
      } else {
        goManual(result.data);
      }
    } catch (e: any) {
      setBusy(false);
      locked.current = false;
      Alert.alert('Opzoeken mislukt', e.message);
    }
  }, [params.date, params.mealType, goManual]);

  const closeBtn = (
    <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={{
      position: 'absolute', top: insets.top + 12, left: 16, width: 36, height: 36, borderRadius: 12,
      backgroundColor: c.overlayFill, alignItems: 'center', justifyContent: 'center', zIndex: 2,
    }}>
      <Icon name="close" size={18} color={c.overlayText} />
    </TouchableOpacity>
  );

  // ── permissie nog niet bekend ──
  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={c.accent} /></View>;
  }

  // ── uitleg vóór de prompt ──
  if (!permission.granted && !explained) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        {closeBtn}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
            <Icon name="barcode" size={28} color={c.accentText} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: c.text, textAlign: 'center', marginBottom: 8 }}>Camera nodig om te scannen</Text>
          <Text style={{ fontSize: 13.5, color: c.sub, textAlign: 'center', lineHeight: 19, marginBottom: 24 }}>
            We gebruiken je camera alleen om de barcode op een verpakking te lezen — er wordt niets opgeslagen of gedeeld.
          </Text>
          <TouchableOpacity activeOpacity={0.85} onPress={async () => { setExplained(true); await requestPermission(); }} style={{ height: 50, paddingHorizontal: 28, borderRadius: 14, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.onAccent }}>Camera toestaan</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={() => goManual()} style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: c.sub }}>Handmatig invoeren</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── permanent geweigerd → herstelpad naar instellingen ──
  if (!permission.granted && explained && !permission.canAskAgain) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        {closeBtn}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: c.text, textAlign: 'center', marginBottom: 8 }}>Camera-toegang geweigerd</Text>
          <Text style={{ fontSize: 13.5, color: c.sub, textAlign: 'center', lineHeight: 19, marginBottom: 24 }}>
            Zet camera-toegang aan bij Instellingen om barcodes te kunnen scannen.
          </Text>
          <TouchableOpacity activeOpacity={0.85} onPress={() => Linking.openSettings()} style={{ height: 50, paddingHorizontal: 28, borderRadius: 14, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.onAccent }}>Open instellingen</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={() => goManual()} style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: c.sub }}>Handmatig invoeren</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── nog niet toegestaan, prompt onderweg (kan opnieuw gevraagd worden) ──
  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        {closeBtn}
        <TouchableOpacity activeOpacity={0.85} onPress={requestPermission} style={{ height: 50, paddingHorizontal: 28, borderRadius: 14, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.onAccent }}>Camera toestaan</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={() => goManual()} style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: c.sub }}>Handmatig invoeren</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── scanner ──
  const translateY = scanLine.interpolate({ inputRange: [0, 1], outputRange: [0, WINDOW_SIZE - 3] });

  return (
    <View style={{ flex: 1, backgroundColor: c.overlay }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        onBarcodeScanned={busy ? undefined : handleScanned}
      />

      {/* donkere overlay met uitgesneden scanvenster: 3 rijen, middelste rij =
          links-overlay + venster + rechts-overlay, zodat het venster altijd centreert. */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <View style={{ flex: 1, backgroundColor: c.overlay }} />
        <View style={{ height: WINDOW_SIZE, flexDirection: 'row' }}>
          <View style={{ flex: 1, backgroundColor: c.overlay }} />
          <View style={{ width: WINDOW_SIZE, height: WINDOW_SIZE, borderRadius: 20, borderWidth: 2, borderColor: c.accent, overflow: 'hidden' }}>
            <Animated.View style={{ position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: c.accent, transform: [{ translateY }] }} />
          </View>
          <View style={{ flex: 1, backgroundColor: c.overlay }} />
        </View>
        <View style={{ flex: 1, backgroundColor: c.overlay }} />
      </View>

      {closeBtn}

      <View style={{ position: 'absolute', left: 0, right: 0, top: insets.top + 70, alignItems: 'center' }}>
        <Text style={{ fontSize: 13.5, fontWeight: '600', color: c.overlayText, textAlign: 'center', paddingHorizontal: 32 }}>
          Richt de camera op de barcode
        </Text>
      </View>

      {busy ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: c.overlay }}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      ) : null}

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 18 }}>
        <TouchableOpacity activeOpacity={0.85} onPress={() => goManual()} style={{
          height: 50, borderRadius: 15, backgroundColor: c.overlayFill, borderWidth: 1, borderColor: c.overlayLine,
          alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
        }}>
          <Icon name="pencil" size={16} color={c.overlayText} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.overlayText }}>Handmatig invoeren</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
