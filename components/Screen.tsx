// components/Screen.tsx — basis-omhulsel voor elk scherm
// Zet de achtergrondkleur uit het thema, houdt rekening met de "veilige zone"
// (notch/statusbalk bovenaan) en maakt de inhoud standaard scrollbaar.
// Gebruik: <Screen>...inhoud...</Screen>  (zet scroll={false} voor een vast scherm)
import React from 'react';
import { View, ScrollView, ViewStyle, StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './store';

export function Screen({
  children, scroll = true, padTop = 8, padBottom = 28, contentStyle,
}: {
  children: React.ReactNode; scroll?: boolean; padTop?: number; padBottom?: number;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + padTop }}>
        {children}
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[{ paddingTop: insets.top + padTop, paddingHorizontal: 16, paddingBottom: padBottom }, contentStyle]}
      >
        {children}
      </ScrollView>
    </View>
  );
}
