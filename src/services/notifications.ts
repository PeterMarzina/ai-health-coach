// src/services/notifications.ts — gedeelde expo-notifications-setup
// Eén plek voor de notification-handler + permissie-aanvraag, gebruikt door
// zowel de rusttimer (restTimer.ts, Deel A1) als de habit-herinneringen
// (habitNotifications.ts, Deel B4). Permissie wordt pas gevraagd op het moment
// dat een van beide features 'm echt nodig heeft, niet meteen bij app-start.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let handlerReady = false;
let permissionPromise: Promise<boolean> | null = null;

export function ensureNotificationHandler(): void {
  if (handlerReady) return;
  handlerReady = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  ensureNotificationHandler();
  if (!permissionPromise) {
    permissionPromise = (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
      const existing = await Notifications.getPermissionsAsync();
      if (existing.granted) return true;
      const requested = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      return requested.granted;
    })().catch(() => false);
  }
  return permissionPromise;
}
