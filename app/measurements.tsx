// app/measurements.tsx — Editable Measurements
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/components/store';
import { useSettings } from '@/components/store';
import { Card } from '@/components/ui';
import { Icon } from '@/components/Icon';

export default function Measurements() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { measurements, setMeasurements } = useSettings();
  const [vals, setVals] = useState(measurements);

  const items = [
    { key: 'weight', label: 'Weight', unit: 'kg' },
    { key: 'height', label: 'Height', unit: 'cm' },
    { key: 'bodyFat', label: 'Body Fat %', unit: '%' },
    { key: 'chest', label: 'Chest', unit: 'cm' },
    { key: 'waist', label: 'Waist', unit: 'cm' },
    { key: 'hips', label: 'Hips', unit: 'cm' },
    { key: 'arms', label: 'Arms', unit: 'cm' },
    { key: 'thighs', label: 'Thighs', unit: 'cm' },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 80, backgroundColor: c.bg }}>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevL" size={19} color={c.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 28, fontWeight: '800', color: c.text, letterSpacing: -0.6, flex: 1 }}>Measurements</Text>
      </View>

      {items.map((it) => (
        <Card key={it.key} pad={16} style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: c.text, marginBottom: 8 }}>{it.label}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TextInput
              value={String(vals[it.key as keyof typeof vals])}
              onChangeText={(t) => {
                const v = parseFloat(t) || 0;
                setVals((a) => ({ ...a, [it.key]: v }));
              }}
              keyboardType="decimal-pad"
              style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.line, backgroundColor: c.cardHi, color: c.text, fontSize: 16, fontWeight: '600' }}
            />
            <Text style={{ fontSize: 14, fontWeight: '700', color: c.sub, minWidth: 40 }}>{it.unit}</Text>
          </View>
        </Card>
      ))}

      <View style={{ flex: 1 }} />

      <TouchableOpacity activeOpacity={0.8} onPress={() => { setMeasurements(vals); router.back(); }} style={{ height: 52, borderRadius: 16, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: c.onAccent }}>Save Measurements</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
