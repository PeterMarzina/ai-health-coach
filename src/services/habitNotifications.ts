// src/services/habitNotifications.ts — dagelijkse herinnering per habit (Deel B4)
// Eén geplande notificatie per habit, met de habit.id als identifier — zo kan
// een herinnering altijd exact opnieuw gepland/geannuleerd worden zonder een
// aparte habit->notificatie-mapping bij te houden. Wordt aangeroepen vanuit
// src/services/habits.ts bij aanmaken/wijzigen/archiveren, zodat er nooit een
// "zwevende" notificatie overblijft voor een verwijderde habit.
import * as Notifications from 'expo-notifications';
import { ensureNotificationPermission } from './notifications';

export async function scheduleHabitReminder(habitId: string, time: string, habitName: string): Promise<boolean> {
  const [hourStr, minuteStr] = time.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return false;

  const granted = await ensureNotificationPermission();
  if (!granted) return false;

  await cancelHabitReminder(habitId);
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: habitId,
      content: { title: habitName, body: "Don't forget today's habit.", sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: 'default',
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelHabitReminder(habitId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(habitId);
  } catch {
    // Was toch al niet gepland — niets aan te doen.
  }
}
