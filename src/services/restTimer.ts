// src/services/restTimer.ts — rusttimer-notificatie (Deel A1)
// De zichtbare countdown is React state in het sessie-scherm; deze module
// plant er een lokale notificatie bovenop die precies afgaat wanneer de rust
// voorbij is, zodat je 'm ook merkt als de app op de achtergrond staat (React
// state pauzeert dan) — "een notificatie als de app op de achtergrond staat".
import * as Notifications from 'expo-notifications';
import { ensureNotificationPermission } from './notifications';

export async function scheduleRestEndNotification(
  seconds: number,
  exerciseName: string
): Promise<string | null> {
  if (seconds <= 0) return null;
  const granted = await ensureNotificationPermission();
  if (!granted) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rest is over',
        body: `Time for your next set of ${exerciseName}.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        channelId: 'default',
      },
    });
  } catch {
    return null;
  }
}

export async function cancelRestEndNotification(notificationId: string | null | undefined): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Al afgegaan of al geannuleerd — niets aan te doen.
  }
}
