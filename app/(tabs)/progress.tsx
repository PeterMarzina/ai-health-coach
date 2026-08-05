// app/(tabs)/progress.tsx — Progress-tab (voortgang in grafieken)
// Periode-knoppen (1W/1M/3M...) sturen echte Supabase-queries aan: een gewicht-
// lijngrafiek (weight_logs), een slaap-lijngrafiek (daily_logs) en een
// trainingsvolume-grafiek (workout_sets). Lichaamssamenstelling gebruikt de
// laatst opgeslagen metingen (profiel), niet langer mock-data.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card, Section, Chip, EmptyState } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { LineChart, Donut, Sparkline } from '@/components/charts';
import { useTheme, useSettings, useAuth } from '@/components/store';
import { todayKey, fetchWeightLogs, logWeight } from '@/src/services/trackingService';
import { fetchRecentDailyLogs } from '@/src/services/trackingService';
import { fetchWorkoutVolumeHistory } from '@/src/services/workouts';
import type { WeightLog } from '@/src/types/tracking';

const RANGES = ['1W', '1M', '3M', '6M', '1Y', 'All'] as const;
const RANGE_DAYS: Record<(typeof RANGES)[number], number> = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, All: 3650 };
const TABS = ['Overview', 'Trends', 'History'];

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Kies max. 5 labels verspreid over de reeks, anders lopen ze vol bij lange periodes.
function pickLabels(dates: string[]): string[] {
  if (dates.length <= 5) return dates.map(shortDate);
  const step = (dates.length - 1) / 4;
  return Array.from({ length: 5 }, (_, i) => shortDate(dates[Math.round(i * step)]));
}

export default function Progress() {
  const { c } = useTheme();
  const { measurements } = useSettings();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session?.user?.id;

  const [range, setRange] = useState<(typeof RANGES)[number]>('1M');
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [sleepSeries, setSleepSeries] = useState<{ date: string; hours: number }[]>([]);
  const [volumeSeries, setVolumeSeries] = useState<{ date: string; volumeKg: number }[]>([]);

  const [weightInput, setWeightInput] = useState('');
  const [logging, setLogging] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const days = RANGE_DAYS[range];
      const [w, sleep, vol] = await Promise.all([
        fetchWeightLogs(userId, days),
        fetchRecentDailyLogs(userId, days),
        fetchWorkoutVolumeHistory(userId, days),
      ]);
      setWeightLogs(w);
      setSleepSeries(sleep.filter((d) => d.sleepHours != null).map((d) => ({ date: d.date, hours: d.sleepHours as number })));
      setVolumeSeries(vol);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [userId, range]);

  useEffect(() => { load(); }, [load]);

  const handleLogWeight = async () => {
    const kg = parseFloat(weightInput.replace(',', '.'));
    if (!userId || !kg || kg <= 0) return;
    setLogging(true);
    try {
      await logWeight(userId, todayKey(), kg);
      setWeightInput('');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLogging(false);
    }
  };

  const latestWeight = weightLogs.length ? weightLogs[weightLogs.length - 1].weightKg : measurements.weight;
  const weightDelta = weightLogs.length >= 2 ? weightLogs[weightLogs.length - 1].weightKg - weightLogs[0].weightKg : 0;

  const bodyFatPct = measurements.bodyFat ?? 0;
  const fatMassKg = Math.round(measurements.weight * (bodyFatPct / 100) * 10) / 10;
  const leanMassKg = Math.round((measurements.weight - fatMassKg) * 10) / 10;
  const bodySegments = [
    { label: 'Lean Mass', kg: leanMassKg, pct: Math.round((leanMassKg / measurements.weight) * 100), hue: 'accent' },
    { label: 'Fat Mass', kg: fatMassKg, pct: Math.round((fatMassKg / measurements.weight) * 100), hue: 'fats' },
  ];

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

      {loading ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* weight chart */}
          <Card pad={16} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
              <View>
                <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600' }}>Weight</Text>
                <Text style={{ fontSize: 27, fontWeight: '800', color: c.text, letterSpacing: -0.8, marginTop: 1 }}>
                  {latestWeight.toFixed(1)} <Text style={{ fontSize: 14, fontWeight: '600', color: c.sub }}>kg</Text>
                </Text>
              </View>
              {weightLogs.length >= 2 ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: weightDelta <= 0 ? c.accentText : c.bad }}>
                    {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg
                  </Text>
                  <Text style={{ fontSize: 11.5, color: c.dim }}>vs start of period</Text>
                </View>
              ) : null}
            </View>

            {weightLogs.length >= 2 ? (
              <LineChart
                data={weightLogs.map((w) => w.weightKg)}
                labels={pickLabels(weightLogs.map((w) => w.date))}
                color={c.accent}
                w={320}
                h={158}
                last
              />
            ) : (
              <EmptyState
                icon="ruler"
                title="Not enough data yet"
                body="Log your weight on at least two days to see a trend line."
              />
            )}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <TextInput
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="decimal-pad"
                placeholder="Log today's weight (kg)"
                placeholderTextColor={c.dim}
                style={{ flex: 1, backgroundColor: c.cardHi, borderWidth: 1, borderColor: c.line, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14, color: c.text }}
              />
              <View
                onTouchEnd={logging ? undefined : handleLogWeight}
                style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', opacity: logging ? 0.6 : 1 }}
              >
                {logging ? <ActivityIndicator color={c.onAccent} size="small" /> : <Icon name="plus" size={18} color={c.onAccent} />}
              </View>
            </View>
          </Card>

          {/* sleep chart */}
          <Section title="Sleep" />
          <Card pad={16} style={{ marginBottom: 16 }}>
            {sleepSeries.length >= 2 ? (
              <LineChart
                data={sleepSeries.map((s) => s.hours)}
                labels={pickLabels(sleepSeries.map((s) => s.date))}
                color={c.sleep}
                w={320}
                h={140}
              />
            ) : (
              <EmptyState
                icon="moon"
                title="No sleep trend yet"
                body="Log your sleep on Recovery to build up a trend here."
                actionLabel="Go to Recovery"
                onAction={() => router.push('/recovery')}
              />
            )}
          </Card>

          {/* body composition */}
          <Section title="Body Composition" action="Edit" onAction={() => router.push('/goals')} />
          <Card pad={16} style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            <View style={{ position: 'relative', width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
              <Donut segments={bodySegments.map((b) => ({ value: b.pct, color: (c as any)[b.hue] || c.accent }))} size={120} stroke={16} />
              <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: c.text }}>{measurements.weight.toFixed(1)}</Text>
                <Text style={{ fontSize: 9.5, color: c.dim }}>kg total</Text>
              </View>
            </View>
            <View style={{ flex: 1, gap: 13 }}>
              {bodySegments.map((b) => (
                <View key={b.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: (c as any)[b.hue] || c.accent }} />
                  <Text style={{ flex: 1, fontSize: 13.5, color: c.text, fontWeight: '500' }}>{b.label}</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: c.text }}>{b.kg} kg</Text>
                  <Text style={{ fontSize: 12, color: c.sub, width: 30, textAlign: 'right' }}>{b.pct}%</Text>
                </View>
              ))}
            </View>
          </Card>

          {/* workout volume */}
          <Section title="Training Volume" />
          <Card pad={15} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {volumeSeries.length >= 2 ? (
              <>
                <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.cardHi, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="dumbbell" size={19} color={c.protein} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.text }}>Total volume</Text>
                  <Text style={{ fontSize: 12, color: c.sub, marginTop: 1 }}>{volumeSeries.length} training days</Text>
                </View>
                <View style={{ width: 88 }}>
                  <Sparkline data={volumeSeries.map((v) => v.volumeKg)} color={c.accent} w={88} h={34} />
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: c.text }}>{Math.round(volumeSeries[volumeSeries.length - 1].volumeKg)} kg</Text>
                  <Text style={{ fontSize: 10.5, color: c.dim }}>last session</Text>
                </View>
              </>
            ) : (
              <EmptyState
                icon="dumbbell"
                title="No workout trend yet"
                body="Log sets in at least two workouts to see your volume trend."
                style={{ flex: 1, paddingVertical: 14 }}
              />
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}
