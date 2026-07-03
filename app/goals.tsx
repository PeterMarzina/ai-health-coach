// app/goals.tsx — Doelen aanpassen
// Invulvelden voor je doelen (calorieën, eiwit, water, ...). Bij opslaan worden ze
// via setGoals() uit useSettings() bewaard, zodat andere schermen de nieuwe waarden zien.
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/components/store';
import { useSettings } from '@/components/store';
import { Card, Placeholder } from '@/components/ui';
import { Icon } from '@/components/Icon';

export default function Goals() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { goals, setGoals } = useSettings();
  const [vals, setVals] = useState(goals);

  const items = [
    { key: 'calories', label: 'Daily Calories', unit: 'kcal', hint: '1200–3000' },
    { key: 'protein', label: 'Daily Protein', unit: 'g', hint: '100–200' },
    { key: 'carbs', label: 'Daily Carbs', unit: 'g', hint: '150–400' },
    { key: 'fats', label: 'Daily Fats', unit: 'g', hint: '50–100' },
    { key: 'water', label: 'Daily Water', unit: 'L', hint: '1.5–3.0' },
    { key: 'sleepHours', label: 'Sleep Target', unit: 'h', hint: '7–9' },
    { key: 'steps', label: 'Daily Steps', unit: 'steps', hint: '5000–15000' },
    { key: 'weightTarget', label: 'Weight Target', unit: 'kg', hint: '70–100' },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 80, backgroundColor: c.bg }}>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevL" size={19} color={c.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 28, fontWeight: '800', color: c.text, letterSpacing: -0.6, flex: 1 }}>Goals</Text>
      </View>

      {items.map((it) => (
        <Card key={it.key} pad={16} style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: c.text, marginBottom: 8 }}>{it.label}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TextInput
              placeholder={it.hint}
              placeholderTextColor={c.dim}
              value={String(vals[it.key as keyof typeof vals])}
              onChangeText={(t) => {
                const v = parseFloat(t.replace(',', '.')) || 0;
                setVals((a) => ({ ...a, [it.key]: v }));
              }}
              keyboardType="decimal-pad"
              style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.line, backgroundColor: c.cardHi, color: c.text, fontSize: 16, fontWeight: '600' }}
            />
            <Text style={{ fontSize: 14, fontWeight: '700', color: c.sub, minWidth: 50 }}>{it.unit}</Text>
          </View>
        </Card>
      ))}

      <View style={{ flex: 1 }} />

      <TouchableOpacity activeOpacity={0.8} onPress={() => { setGoals(vals); router.back(); }} style={{ height: 52, borderRadius: 16, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: c.onAccent }}>Save Goals</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
