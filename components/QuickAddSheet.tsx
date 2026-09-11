// components/QuickAddSheet.tsx — uitschuivend "Snel toevoegen"-paneel onderaan
// Gedeeld door de "+"-knop in de tabbalk (components/TabBar.tsx) en de FAB op het
// voedingsscherm (app/nutrition/index.tsx). Schuift omhoog met een donkere
// achtergrond; tik buiten het paneel of op een actie om te sluiten.
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Animated, Pressable } from 'react-native';
import { useAnimatedValue } from './useAnimatedValue';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './store';
import { Icon, IconName } from './Icon';
import { withAlpha } from '@/constants/theme';

export interface QuickAddAction {
  key: string;
  label: string;
  sub: string;
  icon: IconName;
  color?: string;   // accentkleur van het icoon-vakje; standaard de app-accentkleur
  fill?: boolean;   // icoon gevuld tekenen (bv. vlam, sparkle)
  onPress: () => void;
}

export function QuickAddSheet({
  open, onClose, title, actions,
}: { open: boolean; onClose: () => void; title: string; actions: QuickAddAction[] }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  // Het paneel blijft gemount tijdens de sluit-animatie en verdwijnt pas daarna.
  // Openen zet `mounted` meteen tijdens de render (toegestaan React-patroon), zodat
  // het paneel in dezelfde render al zichtbaar wordt.
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  const y = useAnimatedValue(1);    // 0 = zichtbaar, 1 = weggeschoven
  const fade = useAnimatedValue(0);

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }),
      ]).start();
      return;
    }
    const closing = Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(y, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]);
    closing.start(({ finished }) => { if (finished) setMounted(false); });
    return () => closing.stop();
  }, [open, fade, y]);

  // Eerst sluiten, dan de actie: anders navigeer je terwijl de modal nog open staat.
  const run = (action: QuickAddAction) => {
    onClose();
    setTimeout(action.onPress, 180);
  };

  if (!mounted) return null;
  const translateY = y.interpolate({ inputRange: [0, 1], outputRange: [0, 500] });

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={{ flex: 1, backgroundColor: c.overlay, opacity: fade }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <Animated.View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, transform: [{ translateY }],
        backgroundColor: c.cardHi, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        borderTopWidth: 1, borderColor: c.lineHi,
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 24,
      }}>
        <View style={{ width: 38, height: 4, borderRadius: 4, backgroundColor: c.faint, alignSelf: 'center', marginBottom: 16 }} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: c.text, marginHorizontal: 4, marginBottom: 14 }}>{title}</Text>
        <View style={{ gap: 9 }}>
          {actions.map((action) => {
            const color = action.color ?? c.accent;
            const iconColor = action.color ?? c.accentText;
            return (
              <TouchableOpacity key={action.key} activeOpacity={0.75} onPress={() => run(action)} style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 16, padding: 13,
              }}>
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: withAlpha(color, 0.15), alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={action.icon} size={21} color={iconColor} fill={action.fill ? iconColor : undefined} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>{action.label}</Text>
                  <Text style={{ fontSize: 12.5, color: c.sub, marginTop: 1 }}>{action.sub}</Text>
                </View>
                <Icon name="chevR" size={18} color={c.dim} />
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </Modal>
  );
}
