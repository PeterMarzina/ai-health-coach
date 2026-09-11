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
import { Ring } from '@/components/charts';
import { useTheme, useSettings, useAuth, useLang } from '@/components/store';
import { fill, type TKey } from '@/constants/i18n';
import { todayKey, fetchDailyLog, fetchRecentDailyLogs, upsertDailyLog } from '@/src/services/trackingService';
import { computeRecoveryScore } from '@/src/services/recoveryScore';
import type { RecoveryLabel } from '@/src/services/recoveryScore';

const LABEL_TEXT: Record<RecoveryLabel, { title: TKey; body: TKey; color: 'accent' | 'protein' | 'bad' }> = {
  high: { title: 'rec_high_title', body: 'rec_high_body', color: 'accent' },
  medium: { title: 'rec_medium_title', body: 'rec_medium_body', color: 'protein' },
  low: { title: 'rec_low_title', body: 'rec_low_body', color: 'bad' },
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
  const { t } = useLang();
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
      Alert.alert(t('err_title'), e.message);
    } finally {
      setLoading(false);
    }
  }, [userId, date, t]);

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
      Alert.alert(t('err_title'), e.message);
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
        <Text style={{ fontSize: 28, fontWeight: '800', color: c.text, letterSpacing: -0.6, flex: 1 }}>{t('recovery')}</Text>
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
              <Text style={{ fontSize: 16, fontWeight: '800', color: c.text, marginTop: 12 }}>{t(labelInfo!.title)}</Text>
              <Text style={{ fontSize: 12.5, color: c.sub, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>{t(labelInfo!.body)}</Text>
            </Card>
          ) : null}

          <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{fill(t('rec_sleep_hours'), { hours: sleepTargetHours })}</Text>
          <TextInput
            value={sleepHours}
            onChangeText={setSleepHours}
            keyboardType="decimal-pad"
            placeholder="7.5"
            placeholderTextColor={c.dim}
            style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: c.text, marginBottom: 20 }}
          />

          <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{t('rec_sleep_quality')}</Text>
          <View style={{ marginBottom: 20 }}>
            <Selector value={sleepQuality} onChange={setSleepQuality} c={c} />
          </View>

          <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{t('rec_training_load')}</Text>
          <View style={{ marginBottom: 20 }}>
            <Selector value={trainingLoad} onChange={setTrainingLoad} c={c} />
          </View>

          <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{t('rec_resting_hr')}</Text>
          <TextInput
            value={restingHr}
            onChangeText={setRestingHr}
            keyboardType="number-pad"
            placeholder={t('rec_resting_hr_ph')}
            placeholderTextColor={c.dim}
            style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: c.text, marginBottom: 8 }}
          />
          <Text style={{ fontSize: 11.5, color: c.dim, marginBottom: 24 }}>
            {hrBaseline ? fill(t('rec_hr_baseline'), { bpm: hrBaseline }) : t('rec_hr_no_baseline')}
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={!canSave || saving}
            style={{ height: 52, borderRadius: 15, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: !canSave || saving ? 0.6 : 1 }}
          >
            {saving ? <ActivityIndicator color={c.onAccent} /> : (
              <Text style={{ fontSize: 16, fontWeight: '800', color: c.onAccent }}>{t('rec_save')}</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
