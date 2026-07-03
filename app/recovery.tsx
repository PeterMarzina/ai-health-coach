// app/recovery.tsx — Recovery-scherm
// Handmatige invoer van slaap (uren + kwaliteit), trainingsbelasting en optioneel
// een rustpols-meting. Daaruit berekenen we een Recovery Score v1
// (src/services/recoveryScore.ts) — rule-based, geen wearable-koppeling nodig.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Ring } from '@/components/Charts';
import { useTheme, useSettings, useAuth } from '@/components/store';
import { todayKey, fetchDailyLog, fetchRecentDailyLogs, upsertDailyLog } from '@/src/services/trackingService';
import { computeRecoveryScore } from '@/src/services/recoveryScore';
import type { RecoveryLabel } from '@/src/services/recoveryScore';

const LABEL_TEXT: Record<RecoveryLabel, { title: string; body: string; color: 'accent' | 'protein' | 'bad' }> = {
  high: { title: 'Well recovered', body: "You're ready for a hard training session today.", color: 'accent' },
  medium: { title: 'Moderate recovery', body: 'Train, but keep an eye on intensity — consider a lighter session.', color: 'protein' },
  low: { title: 'Prioritize rest', body: 'Your body needs recovery — consider a rest day or light activity.', color: 'bad' },
};

function Selector({ value, onChange, count = 5, c }: { value: number | null; onChange: (v: number) => void; count?: number; c: any }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
        const on = value === n;
        return (
          <TouchableOpacity key={n} activeOpacity={0.7} onPress={() => onChange(n)}
            style={{ flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : 'transparent' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: on ? c.onAccent : c.sub }}>{n}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function Recovery() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profileContext } = useSettings();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const date = todayKey();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [trainingLoad, setTrainingLoad] = useState<number | null>(null);
  const [restingHr, setRestingHr] = useState('');
  const [hrBaseline, setHrBaseline] = useState<number | null>(null);
  const [result, setResult] = useState<{ score: number; label: RecoveryLabel } | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [today, recent] = await Promise.all([fetchDailyLog(userId, date), fetchRecentDailyLogs(userId, 7)]);
      if (today.sleepHours != null) setSleepHours(String(today.sleepHours));
      if (today.sleepQuality != null) setSleepQuality(today.sleepQuality);
      if (today.trainingLoad != null) setTrainingLoad(today.trainingLoad);
      if (today.restingHeartRate != null) setRestingHr(String(today.restingHeartRate));
      if (today.recoveryScore != null) setResult({ score: today.recoveryScore, label: today.recoveryScore >= 75 ? 'high' : today.recoveryScore >= 45 ? 'medium' : 'low' });

      const priorHr = recent.filter((r) => r.date !== date && r.restingHeartRate != null).map((r) => r.restingHeartRate as number);
      setHrBaseline(priorHr.length >= 2 ? Math.round(priorHr.reduce((a, b) => a + b, 0) / priorHr.length) : null);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [userId, date]);

  useEffect(() => { load(); }, [load]);

  const num = (s: string) => parseFloat(s.replace(',', '.')) || 0;
  const canSave = num(sleepHours) > 0 && sleepQuality !== null && trainingLoad !== null;

  const handleSave = async () => {
    if (!userId || !canSave) return;
    setSaving(true);
    try {
      const rhr = restingHr.trim() ? Math.round(num(restingHr)) : null;
      const computed = computeRecoveryScore({
        sleepHours: num(sleepHours),
        sleepQuality: sleepQuality!,
        trainingLoad: trainingLoad!,
        restingHeartRate: rhr,
        restingHeartRateBaseline: hrBaseline,
      });
      await upsertDailyLog(userId, date, {
        sleepHours: num(sleepHours),
        sleepQuality,
        trainingLoad,
        restingHeartRate: rhr,
        recoveryScore: computed.score,
      });
      setResult(computed);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const sleepTargetHours = profileContext?.derived.sleepTargetHours ?? 8;
  const labelInfo = result ? LABEL_TEXT[result.label] : null;
  const labelColor = labelInfo ? (labelInfo.color === 'accent' ? c.accent : labelInfo.color === 'bad' ? c.bad : c.protein) : c.accent;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, backgroundColor: c.bg }}>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevL" size={19} color={c.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 28, fontWeight: '800', color: c.text, letterSpacing: -0.6, flex: 1 }}>Recovery</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
      ) : (
        <>
          {result ? (
            <Card accent pad={18} style={{ alignItems: 'center', marginBottom: 20 }}>
              <Ring size={120} stroke={12} value={result.score} color={labelColor} glow>
                <Text style={{ fontSize: 32, fontWeight: '800', color: c.text }}>{result.score}</Text>
                <Text style={{ fontSize: 10.5, color: c.dim }}>/ 100</Text>
              </Ring>
              <Text style={{ fontSize: 16, fontWeight: '800', color: c.text, marginTop: 12 }}>{labelInfo!.title}</Text>
              <Text style={{ fontSize: 12.5, color: c.sub, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>{labelInfo!.body}</Text>
            </Card>
          ) : null}

          <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>Hours of sleep (target ~{sleepTargetHours}h)</Text>
          <TextInput
            value={sleepHours}
            onChangeText={setSleepHours}
            keyboardType="decimal-pad"
            placeholder="7.5"
            placeholderTextColor={c.dim}
            style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: c.text, marginBottom: 20 }}
          />

          <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>Sleep quality (1 = poor, 5 = excellent)</Text>
          <View style={{ marginBottom: 20 }}>
            <Selector value={sleepQuality} onChange={setSleepQuality} c={c} />
          </View>

          <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>Training load recently (1 = light, 5 = very heavy)</Text>
          <View style={{ marginBottom: 20 }}>
            <Selector value={trainingLoad} onChange={setTrainingLoad} c={c} />
          </View>

          <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>Resting heart rate (optional, if you know it)</Text>
          <TextInput
            value={restingHr}
            onChangeText={setRestingHr}
            keyboardType="number-pad"
            placeholder="e.g. 58"
            placeholderTextColor={c.dim}
            style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: c.text, marginBottom: 8 }}
          />
          <Text style={{ fontSize: 11.5, color: c.dim, marginBottom: 24 }}>
            {hrBaseline ? `Your recent average: ~${hrBaseline} bpm` : 'Log it a few days in a row to unlock a baseline comparison.'}
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={!canSave || saving}
            style={{ height: 52, borderRadius: 15, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: !canSave || saving ? 0.6 : 1 }}
          >
            {saving ? <ActivityIndicator color={c.onAccent} /> : (
              <Text style={{ fontSize: 16, fontWeight: '800', color: c.onAccent }}>Save & calculate</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
