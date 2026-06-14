// app/nutrition.tsx — Voeding-scherm
// Toont je dagelijkse inname versus je doelen (calorieën/eiwit/water) met een
// ronde grafiek (Ring) en balken (Bar). Doelen komen uit useSettings(),
// de gegeten waarden uit CONSUMED in constants/data.ts (mock).
import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Check, Bar } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Ring } from '@/components/charts';
import { useTheme } from '@/components/store';
import { useSettings } from '@/components/store';
import { DATA, CONSUMED } from '@/constants/data';

export default function Nutrition() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { goals } = useSettings();
  const [meals, setMeals] = useState(DATA.nutrition.meals.map((m) => m.done));
  const toggle = (i: number) => setMeals((a) => a.map((v, j) => (j === i ? !v : v)));

  const N = DATA.nutrition;
  const rings = [
    { label: 'Calories', v: CONSUMED.calories, goal: goals.calories, unit: 'kcal', icon: 'flame' as const, color: c.calories },
    { label: 'Protein', v: CONSUMED.protein, goal: goals.protein, unit: 'g', icon: 'target' as const, color: c.protein },
    { label: 'Water', v: CONSUMED.water, goal: goals.water, unit: 'L', icon: 'droplet' as const, color: c.water },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: insets.bottom + 20, backgroundColor: c.bg }}>
      {/* header */}
      <Text style={{ fontSize: 30, fontWeight: '800', color: c.text, letterSpacing: -0.6, marginBottom: 4 }}>Nutrition</Text>
      <Text style={{ fontSize: 13.5, color: c.sub, fontWeight: '600', marginBottom: 20 }}>Today</Text>

      {/* macro rings */}
      <View style={{ flexDirection: 'row', gap: 11, marginBottom: 20 }}>
        {rings.map((r) => (
          <Card key={r.label} pad={13} style={{ flex: 1, alignItems: 'center', borderRadius: 18 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: c.sub, marginBottom: 10, alignSelf: 'flex-start' }}>{r.label}</Text>
            <Ring size={86} stroke={9} value={(r.v / r.goal) * 100} color={r.color}>
              <Icon name={r.icon} size={18} color={r.color} fill={r.icon === 'flame' || r.icon === 'droplet' ? r.color : undefined} />
            </Ring>
            <View style={{ marginTop: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: c.text, letterSpacing: -0.4 }}>{r.v}</Text>
              <Text style={{ fontSize: 10.5, color: c.dim }}>/ {r.goal} {r.unit}</Text>
            </View>
          </Card>
        ))}
      </View>

      {/* macros breakdown */}
      <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 12, marginHorizontal: 2 }}>Macros</Text>
      <Card pad={16} style={{ marginBottom: 20, gap: 16 }}>
        {N.macros.map((m) => (
          <View key={m.label}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>{m.label}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                <Text style={{ fontSize: 12.5, color: c.sub }}>{m.v} / {m.goal}{m.unit}</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: (c as any)[m.hue] || c.accent, width: 32, textAlign: 'right' }}>{m.pct}%</Text>
              </View>
            </View>
            <Bar value={m.pct} max={100} color={(c as any)[m.hue] || c.accent} height={8} />
          </View>
        ))}
      </Card>

      {/* meals */}
      <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 12, marginHorizontal: 2 }}>Meals</Text>
      <View style={{ gap: 10 }}>
        {DATA.nutrition.meals.map((m, i) => (
          <Card key={m.name} pad={12} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, opacity: meals[i] ? 0.78 : 1 }}>
            <Placeholder label="FOOD" style={{ width: 52, height: 52, borderRadius: 13 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.text }}>{m.name}</Text>
              <Text style={{ fontSize: 12, color: c.sub, marginTop: 2 }}>{m.items}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>{m.kcal} <Text style={{ fontSize: 10.5, color: c.dim, fontWeight: '500' }}>kcal</Text></Text>
              <Check on={meals[i]} onToggle={() => toggle(i)} size={22} />
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}
