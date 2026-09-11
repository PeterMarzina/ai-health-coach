// components/NumberForm.tsx — scherm met getal-invulvelden + opslaan-knop
// Gedeeld door Doelen (app/goals.tsx) en Metingen (app/measurements.tsx).
//
// De velden bewaren de TEKST die je typt, niet meteen een getal. Anders verdwijnt
// een punt of komma tijdens het typen: "78." wordt parseFloat → 78 → "78", en je
// kunt nooit 78.5 invullen. Pas bij opslaan wordt de tekst een getal.
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/components/store';
import { Card } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { parseDecimal } from '@/src/lib/parseDecimal';

export interface NumberField<K extends string> {
  key: K;
  label: string;
  unit: string;
  hint?: string; // placeholder, bv. een gebruikelijk bereik
}

// Alleen cijfers en één decimaalteken doorlaten.
function sanitize(text: string): string {
  const cleaned = text.replace(/[^0-9.,]/g, '');
  const sep = cleaned.search(/[.,]/);
  if (sep === -1) return cleaned;
  return cleaned.slice(0, sep + 1) + cleaned.slice(sep + 1).replace(/[.,]/g, '');
}

export function NumberForm<K extends string>({
  title, fields, values, saveLabel, onSave,
}: {
  title: string;
  fields: NumberField<K>[];
  values: Record<K, number>;
  saveLabel: string;
  onSave: (values: Record<K, number>) => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [texts, setTexts] = useState<Record<K, string>>(() => {
    const initial = {} as Record<K, string>;
    for (const f of fields) initial[f.key] = values[f.key] ? String(values[f.key]) : '';
    return initial;
  });

  const save = () => {
    const parsed = { ...values };
    for (const f of fields) parsed[f.key] = parseDecimal(texts[f.key]);
    onSave(parsed);
    router.back();
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 80, backgroundColor: c.bg }}>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevL" size={19} color={c.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 28, fontWeight: '800', color: c.text, letterSpacing: -0.6, flex: 1 }}>{title}</Text>
      </View>

      {fields.map((f) => (
        <Card key={f.key} pad={16} style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: c.text, marginBottom: 8 }}>{f.label}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TextInput
              value={texts[f.key]}
              placeholder={f.hint ?? '—'}
              placeholderTextColor={c.dim}
              onChangeText={(text) => setTexts((prev) => ({ ...prev, [f.key]: sanitize(text) }))}
              keyboardType="decimal-pad"
              style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.line, backgroundColor: c.cardHi, color: c.text, fontSize: 16, fontWeight: '600' }}
            />
            <Text style={{ fontSize: 14, fontWeight: '700', color: c.sub, minWidth: 50 }}>{f.unit}</Text>
          </View>
        </Card>
      ))}

      <TouchableOpacity activeOpacity={0.8} onPress={save} style={{ height: 52, borderRadius: 16, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: c.onAccent }}>{saveLabel}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
