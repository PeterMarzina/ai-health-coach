// components/TabBar.tsx — eigen tabbalk onderaan het scherm
// Toont 4 tabs (Home, Plan, Progress, Profile) met in het midden een ronde "+"-knop.
// Die "+"-knop opent een uitschuivend menu (AddSheet) met snelle acties.
// De actieve tab krijgt de accentkleur; de rest is gedimd.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Animated, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useRouter } from 'expo-router';
import { useTheme } from './store';
import { Icon, IconName } from './Icon';
import { withAlpha } from '@/constants/theme';

const ITEMS: { route: string; label: string; icon: IconName }[] = [
  { route: 'index', label: 'Home', icon: 'home' },
  { route: 'plan', label: 'Plan', icon: 'plan' },
  { route: 'progress', label: 'Progress', icon: 'chart' },
  { route: 'profile', label: 'Profile', icon: 'user' },
];

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState(false);
  const activeName = state.routes[state.index]?.name;

  const left = ITEMS.slice(0, 2);
  const right = ITEMS.slice(2);

  const renderTab = (it: { route: string; label: string; icon: IconName }) => {
    const active = activeName === it.route;
    return (
      <TouchableOpacity key={it.route} activeOpacity={0.7} onPress={() => navigation.navigate(it.route)}
        style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 2 }}>
        <Icon name={it.icon} size={23} color={active ? c.accentText : c.dim} strokeWidth={active ? 2.1 : 1.8} />
        <Text style={{ fontSize: 10.5, fontWeight: active ? '700' : '500', color: active ? c.accentText : c.dim }}>{it.label}</Text>
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
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [mounted, setMounted] = useState(open);
  const y = useRef(new Animated.Value(1)).current; // 0 = shown, 1 = hidden
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(y, { toValue: 1, duration: 240, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setMounted(false); });
    }
  }, [open]);

  const go = (path: string) => { onClose(); setTimeout(() => router.push(path as any), 180); };

  const items: { key: string; label: string; sub: string; icon: IconName; color: string; path: string }[] = [
    { key: 'workout', label: 'Start Workout', sub: 'Lower Body Strength', icon: 'dumbbell', color: c.accent, path: '/plan/workout' },
    { key: 'nutrition', label: 'Log Nutrition', sub: 'Track a meal', icon: 'flame', color: c.calories, path: '/nutrition' },
    { key: 'weight', label: 'Log Weight', sub: 'Update measurements', icon: 'chart', color: c.water, path: '/measurements' },
    { key: 'coach', label: 'Ask Coach', sub: 'AI guidance', icon: 'sparkle', color: c.protein, path: '/nutrition' },
  ];

  if (!mounted) return null;
  const translateY = y.interpolate({ inputRange: [0, 1], outputRange: [0, 500] });

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', opacity: fade }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <Animated.View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        transform: [{ translateY }],
        backgroundColor: c.cardHi, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        borderTopWidth: 1, borderColor: c.lineHi,
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 24,
      }}>
        <View style={{ width: 38, height: 4, borderRadius: 4, backgroundColor: c.faint, alignSelf: 'center', marginBottom: 16 }} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: c.text, marginHorizontal: 4, marginBottom: 14 }}>Quick Add</Text>
        <View style={{ gap: 9 }}>
          {items.map((it) => (
            <TouchableOpacity key={it.key} activeOpacity={0.75} onPress={() => go(it.path)} style={{
              flexDirection: 'row', alignItems: 'center', gap: 14,
              backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 16, padding: 13,
            }}>
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: withAlpha(it.color, 0.15), alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={it.icon} size={21} color={it.color} fill={it.icon === 'flame' || it.icon === 'sparkle' ? it.color : undefined} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>{it.label}</Text>
                <Text style={{ fontSize: 12.5, color: c.sub, marginTop: 1 }}>{it.sub}</Text>
              </View>
              <Icon name="chevR" size={18} color={c.dim} />
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}
