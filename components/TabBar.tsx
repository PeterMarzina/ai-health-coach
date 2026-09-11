// components/TabBar.tsx — eigen tabbalk onderaan het scherm
// Toont 4 tabs (Home, Plan, Progress, Profile) met in het midden een ronde "+"-knop.
// Die "+"-knop opent een uitschuivend menu (QuickAddSheet) met snelle acties.
// De actieve tab krijgt de accentkleur; de rest is gedimd.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useRouter } from 'expo-router';
import { useTheme, useLang } from './store';
import { Icon, IconName } from './Icon';
import { QuickAddSheet, QuickAddAction } from './QuickAddSheet';
import type { TKey } from '@/constants/i18n';

const ITEMS: { route: string; label: TKey; icon: IconName }[] = [
  { route: 'index', label: 'home', icon: 'home' },
  { route: 'plan', label: 'plan', icon: 'plan' },
  { route: 'progress', label: 'progress', icon: 'chart' },
  { route: 'profile', label: 'profile', icon: 'user' },
];

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { c } = useTheme();
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState(false);
  const activeName = state.routes[state.index]?.name;

  const left = ITEMS.slice(0, 2);
  const right = ITEMS.slice(2);

  const renderTab = (it: (typeof ITEMS)[number]) => {
    const active = activeName === it.route;
    return (
      <TouchableOpacity key={it.route} activeOpacity={0.7} onPress={() => navigation.navigate(it.route)}
        style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 2 }}>
        <Icon name={it.icon} size={23} color={active ? c.accentText : c.dim} strokeWidth={active ? 2.1 : 1.8} />
        <Text style={{ fontSize: 10.5, fontWeight: active ? '700' : '500', color: active ? c.accentText : c.dim }}>{t(it.label)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'flex-start',
      paddingTop: 9, paddingBottom: Math.max(insets.bottom, 10),
      backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.line,
    }}>
      {left.map(renderTab)}
      {/* center FAB slot */}
      <View style={{ width: 70, alignItems: 'center' }}>
        <TouchableOpacity activeOpacity={0.85} onPress={() => setSheet(true)} style={{
          width: 56, height: 56, borderRadius: 28, marginTop: -26,
          backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center',
          borderWidth: 5, borderColor: c.bg,
          shadowColor: c.accent, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8,
        }}>
          <Icon name="plus" size={26} color={c.onAccent} strokeWidth={2.6} />
        </TouchableOpacity>
      </View>
      {right.map(renderTab)}

      <AddSheet open={sheet} onClose={() => setSheet(false)} />
    </View>
  );
}

function AddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const { t } = useLang();
  const router = useRouter();

  const actions: QuickAddAction[] = [
    { key: 'workout', label: t('qa_workout'), sub: t('qa_workout_sub'), icon: 'dumbbell', color: c.accent, onPress: () => router.push('/plan/workout') },
    { key: 'nutrition', label: t('qa_nutrition'), sub: t('qa_nutrition_sub'), icon: 'flame', color: c.calories, fill: true, onPress: () => router.push('/nutrition') },
    // Gewicht loggen gebeurt op Progress (weight_logs); Measurements past alleen het profiel aan.
    { key: 'weight', label: t('qa_weight'), sub: t('qa_weight_sub'), icon: 'chart', color: c.water, onPress: () => router.push('/progress') },
    { key: 'coach', label: t('qa_coach'), sub: t('qa_coach_sub'), icon: 'sparkle', color: c.protein, fill: true, onPress: () => router.push('/coach') },
  ];

  return <QuickAddSheet open={open} onClose={onClose} title={t('quick_add')} actions={actions} />;
}
