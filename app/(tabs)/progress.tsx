// app/(tabs)/progress.tsx — Progress with charts
import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/Screen';
import { Card, Section, Chip } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { LineChart, Donut, Sparkline } from '@/components/charts';
import { useTheme } from '@/components/store';
import { DATA } from '@/constants/data';

const RANGES = ['1W', '1M', '3M', '6M', '1Y', 'All'];
const TABS = ['Overview', 'Trends', 'History'];

export default function Progress() {
  const { c } = useTheme();
  const [range, setRange] = useState('1M');
  const [tab, setTab] = useState('Overview');

  return (
    <Screen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: c.text, letterSpacing: -0.6, marginBottom: 16 }}>Progress</Text>

      {/* tabs */}
      <View style={{ flexDirection: 'row', gap: 22, borderBottomWidth: 1, borderBottomColor: c.line, marginBottom: 18, paddingHorizontal: 2 }}>
        {TABS.map((t) => (
          <Text key={t} style={{ fontSize: 14.5, fontWeight: tab === t ? '700' : '500', color: tab === t ? c.text : c.sub, paddingBottom: 11 }}>
            {t}
          </Text>
        ))}
      </View>

      {/* time chips */}
      <View style={{ flexDirection: 'row', gap: 7, marginBottom: 18 }}>
        {RANGES.map((r) => (
          <Chip key={r} label={r} active={range === r} onPress={() => setRange(r)} style={{ flex: 1 }} />
        ))}
      </View>

      {/* weight chart */}
      <Card pad={16} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
          <View>
            <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600' }}>Weight</Text>
            <Text style={{ fontSize: 27, fontWeight: '800', color: c.text, letterSpacing: -0.8, marginTop: 1 }}>78.4 <Text style={{ fontSize: 14, fontWeight: '600', color: c.sub }}>kg</Text></Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: c.accentText }}>−0.6 kg</Text>
            <Text style={{ fontSize: 11.5, color: c.dim }}>vs last month</Text>
          </View>
        </View>
        <LineChart data={DATA.weight.seriesMonth} labels={DATA.weight.labelsMonth} color={c.accent} w={320} h={158} yTicks={[82, 80, 78, 76]} last />
      </Card>

      {/* body composition */}
      <Section title="Body Composition" action="See details" />
      <Card pad={16} style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 18 }}>
        <View style={{ position: 'relative', width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
          <Donut segments={DATA.body.map((b) => ({ value: b.pct, color: (c as any)[b.hue] || c.accent }))} size={120} stroke={16} />
          <View style={{ position: 'absolute', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: c.text }}>85.1</Text>
            <Text style={{ fontSize: 9.5, color: c.dim }}>kg total</Text>
          </View>
        </View>
        <View style={{ flex: 1, gap: 13 }}>
          {DATA.body.map((b) => (
            <View key={b.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: (c as any)[b.hue] || c.accent }} />
              <Text style={{ flex: 1, fontSize: 13.5, color: c.text, fontWeight: '500' }}>{b.label}</Text>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: c.text }}>{b.kg} kg</Text>
              <Text style={{ fontSize: 12, color: c.sub, width: 30, textAlign: 'right' }}>{b.pct}%</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* strength */}
      <Section title="Strength" action="See all" />
      <Card pad={15} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.cardHi, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chart" size={19} color={c.protein} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.text }}>Back Squat</Text>
          <Text style={{ fontSize: 12, color: c.sub, marginTop: 1 }}>1RM · 100 kg</Text>
        </View>
        <View style={{ width: 88 }}>
          <Sparkline data={DATA.strength.series} color={c.accent} w={88} h={34} />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: c.accentText }}>+5 kg</Text>
          <Text style={{ fontSize: 10.5, color: c.dim }}>vs last mo.</Text>
        </View>
      </Card>
    </Screen>
  );
}
