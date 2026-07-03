// components/ui.tsx — herbruikbare bouwstenen voor de schermen
// Card    = kaartje met afgeronde hoeken (klikbaar als je onPress meegeeft)
// Section = kop boven een blok, met optioneel een actie-link rechts
// Chip    = klein keuzeknopje (bv. 1W / 1M / 3M)
// Check   = rond vinkje (aan/uit)
// Bar     = voortgangsbalk die naar zijn waarde toe animeert
// Placeholder / Divider = opvulvak en scheidslijntje
import React, { useEffect, useRef } from 'react';
import { View, Text, TextInput, TextInputProps, TouchableOpacity, Animated, ActivityIndicator, Platform, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from './store';
import { Icon } from './Icon';

const MONO = Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' });

export function Card({
  children, style, onPress, accent, pad = 16,
}: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accent?: boolean; pad?: number }) {
  const { c } = useTheme();
  const base: ViewStyle = {
    backgroundColor: c.card,
    borderRadius: 22,
    padding: pad,
    borderWidth: 1,
    borderColor: accent ? c.accentSoft : c.line,
  };
  if (onPress) {
    return <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[base, style]}>{children}</TouchableOpacity>;
  }
  return <View style={[base, style]}>{children}</View>;
}

export function Section({
  title, action, onAction, style,
}: { title: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 12, marginHorizontal: 2 }, style]}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, letterSpacing: -0.2 }}>{title}</Text>
      {action ? (
        <TouchableOpacity onPress={onAction} disabled={!onAction} activeOpacity={0.6}>
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: c.accentText }}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function Input({
  label, style, ...inputProps
}: { label?: string; style?: StyleProp<ViewStyle> } & TextInputProps) {
  const { c } = useTheme();
  return (
    <View style={style}>
      {label ? (
        <Text style={{ fontSize: 12.5, color: c.sub, fontWeight: '600', marginBottom: 6, marginLeft: 2 }}>{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor={c.dim}
        {...inputProps}
        style={{
          backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 14,
          paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: c.text,
        }}
      />
    </View>
  );
}

export function Button({
  label, onPress, loading, disabled, variant = 'accent', icon, style,
}: {
  label: string; onPress?: () => void; loading?: boolean; disabled?: boolean;
  variant?: 'accent' | 'outline'; icon?: React.ComponentProps<typeof Icon>['name']; style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const isAccent = variant === 'accent';
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[{
        height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
        backgroundColor: isAccent ? c.accent : 'transparent',
        borderWidth: isAccent ? 0 : 1,
        borderColor: c.line,
        opacity: disabled || loading ? 0.7 : 1,
      }, style]}
    >
      {loading ? (
        <ActivityIndicator color={isAccent ? c.onAccent : c.text} />
      ) : (
        <>
          <Text style={{ color: isAccent ? c.onAccent : c.text, fontSize: 16, fontWeight: '700' }}>{label}</Text>
          {icon ? <Icon name={icon} size={18} color={isAccent ? c.onAccent : c.text} /> : null}
        </>
      )}
    </TouchableOpacity>
  );
}

export function Placeholder({
  label, style, radius = 12,
}: { label?: string; style?: StyleProp<ViewStyle>; radius?: number }) {
  const { c } = useTheme();
  return (
    <View style={[{
      borderRadius: radius, backgroundColor: c.cardLo, borderWidth: 1, borderColor: c.line,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }, style]}>
      {label ? (
        <Text style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 0.3, color: c.dim, textAlign: 'center', paddingHorizontal: 6 }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

export function Chip({
  label, active, onPress, style,
}: { label: string; active?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[{
      flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
      borderWidth: 1, borderColor: active ? c.accent : c.line,
      backgroundColor: active ? c.accent : 'transparent',
    }, style]}>
      <Text style={{ fontSize: 12.5, fontWeight: active ? '800' : '600', color: active ? c.onAccent : c.sub }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Check({
  on, onToggle, size = 24, color,
}: { on: boolean; onToggle?: () => void; size?: number; color?: string }) {
  const { c } = useTheme();
  const col = color || c.accent;
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onToggle} style={{
      width: size, height: size, borderRadius: size / 2,
      borderWidth: 2, borderColor: on ? col : c.faint,
      backgroundColor: on ? col : 'transparent',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {on ? <Icon name="check" size={size * 0.6} color={c.onAccent} strokeWidth={3.2} /> : null}
    </TouchableOpacity>
  );
}

export function Bar({
  value, max = 100, color, height = 7, delay = 0,
}: { value: number; max?: number; color?: string; height?: number; delay?: number }) {
  const { c } = useTheme();
  const col = color || c.accent;
  const pct = Math.max(0, Math.min(1, value / max));
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 850, delay, useNativeDriver: false }).start();
  }, [pct, delay]);
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={{ width: '100%', height, borderRadius: height, backgroundColor: c.track, overflow: 'hidden' }}>
      <Animated.View style={{ width, height: '100%', borderRadius: height, backgroundColor: col }} />
    </View>
  );
}

// Lege staat voor lijsten/grafieken zonder data (bv. nog geen gewicht gelogd).
// icon = naam uit Icon-set, title = korte kop, body = uitleg, action = optionele knop.
export function EmptyState({
  icon, title, body, actionLabel, onAction, style,
}: {
  icon?: React.ComponentProps<typeof Icon>['name']; title: string; body?: string;
  actionLabel?: string; onAction?: () => void; style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center', paddingVertical: 28, paddingHorizontal: 16 }, style]}>
      {icon ? (
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.cardHi, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Icon name={icon} size={20} color={c.dim} />
        </View>
      ) : null}
      <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.text, textAlign: 'center' }}>{title}</Text>
      {body ? (
        <Text style={{ fontSize: 12.5, color: c.sub, textAlign: 'center', marginTop: 5, lineHeight: 18 }}>{body}</Text>
      ) : null}
      {actionLabel ? (
        <TouchableOpacity activeOpacity={0.75} onPress={onAction} style={{ marginTop: 14, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12, backgroundColor: c.accent }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: c.onAccent }}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function Divider() {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.line }} />;
}

export const monoFont = MONO;
