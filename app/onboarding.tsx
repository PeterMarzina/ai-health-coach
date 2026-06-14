// app/onboarding.tsx — vragenlijst na registreren
// Vraagt naam, hoofddoel, huidig + streefgewicht en activiteitsniveau.
// Daaruit berekenen we alvast je doelen (calorieën, eiwit, stappen, ...) en slaan
// alles op in je Supabase-profiel. Bovenaan kun je de taal (NL/EN) kiezen.
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { useTheme, useLang, useSettings, useAuth } from '@/components/store';
import { Card } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { supabase } from '../src/lib/supabase';
import { DEFAULT_GOALS, DEFAULT_MEASUREMENTS } from '@/constants/data';

// De keuzes voor het hoofddoel (key = wat we opslaan, labelKey = vertaalde tekst).
const GOALS = [
  { key: 'lose', labelKey: 'goal_lose', icon: 'flame' },
  { key: 'muscle', labelKey: 'goal_muscle', icon: 'dumbbell' },
  { key: 'fit', labelKey: 'goal_fit', icon: 'target' },
  { key: 'maintain', labelKey: 'goal_maintain', icon: 'leaf' },
] as const;

const ACTIVITIES = [
  { key: 'low', labelKey: 'act_low', factor: 28, steps: 6000 },
  { key: 'med', labelKey: 'act_med', factor: 32, steps: 9000 },
  { key: 'high', labelKey: 'act_high', factor: 37, steps: 12000 },
] as const;

export default function Onboarding() {
  const { c } = useTheme();
  const { t, lang, setLang } = useLang();
  const { setGoals, setMeasurements } = useSettings();
  const { markOnboarded } = useAuth();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [goal, setGoal] = useState<string>('');
  const [curWeight, setCurWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [activity, setActivity] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const num = (s: string) => parseFloat(s.replace(',', '.')) || 0;

  const handleFinish = async () => {
    const cur = num(curWeight);
    const target = num(targetWeight);
    if (!name || !goal || !activity || cur <= 0 || target <= 0) {
      Alert.alert(t('oops'), t('ob_missing'));
      return;
    }

    // Doelen afleiden uit de antwoorden.
    const act = ACTIVITIES.find((a) => a.key === activity)!;
    let calories = Math.round(cur * act.factor);
    if (goal === 'lose') calories -= 300;
    if (goal === 'muscle') calories += 250;

    const newGoals = {
      ...DEFAULT_GOALS,
      calories,
      protein: Math.round(cur * 1.8),
      steps: act.steps,
      weightTarget: target,
    };
    const newMeasurements = { ...DEFAULT_MEASUREMENTS, weight: cur };

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      // Profiel + doelen + metingen in één keer opslaan in Supabase.
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: name,
        health_goal: goal,
        goals: newGoals,
        measurements: newMeasurements,
        updated_at: new Date(),
      });
      if (error) throw error;

      // Lokale state bijwerken zodat de tabs meteen de juiste waarden tonen.
      setGoals(newGoals);
      setMeasurements(newMeasurements);

      markOnboarded(); // de poort stuurt je nu automatisch naar de tabs
    } catch (e: any) {
      Alert.alert(t('err_title'), e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Taalkeuze rechtsboven: NL / EN */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
        {(['nl', 'en'] as const).map((l) => (
          <TouchableOpacity
            key={l}
            activeOpacity={0.7}
            onPress={() => setLang(l)}
            style={{
              paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10,
              borderWidth: 1, borderColor: lang === l ? c.accent : c.line,
              backgroundColor: lang === l ? c.accent : 'transparent',
            }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: lang === l ? c.onAccent : c.sub }}>
              {l.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Titel */}
      <Text style={{ fontSize: 26, fontWeight: '800', color: c.text, letterSpacing: -0.5 }}>{t('ob_title')}</Text>
      <Text style={{ fontSize: 13.5, color: c.sub, marginTop: 6, marginBottom: 24 }}>{t('ob_subtitle')}</Text>

      {/* Naam */}
      <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{t('ob_name_label')}</Text>
      <TextInput
        placeholder={t('ob_name_ph')}
        placeholderTextColor={c.dim}
        value={name}
        onChangeText={setName}
        style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: c.text, marginBottom: 22 }}
      />

      {/* Hoofddoel */}
      <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{t('ob_goal_label')}</Text>
      <View style={{ gap: 9, marginBottom: 22 }}>
        {GOALS.map((g) => {
          const on = goal === g.key;
          return (
            <Card key={g.key} onPress={() => setGoal(g.key)} pad={13}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 13, borderColor: on ? c.accent : c.line }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: on ? c.accent : c.cardHi, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={g.icon as any} size={20} color={on ? c.onAccent : c.sub} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: c.text }}>{t(g.labelKey)}</Text>
              {on ? <Icon name="check" size={20} color={c.accentText} strokeWidth={2.6} /> : null}
            </Card>
          );
        })}
      </View>

      {/* Gewicht (huidig + streef) */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 22 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{t('ob_curweight')}</Text>
          <TextInput value={curWeight} onChangeText={setCurWeight} keyboardType="numeric" placeholder="78" placeholderTextColor={c.dim}
            style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: c.text }} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{t('ob_targetweight')}</Text>
          <TextInput value={targetWeight} onChangeText={setTargetWeight} keyboardType="numeric" placeholder="75" placeholderTextColor={c.dim}
            style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: c.text }} />
        </View>
      </View>

      {/* Activiteitsniveau */}
      <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{t('ob_activity')}</Text>
      <View style={{ flexDirection: 'row', gap: 9, marginBottom: 30 }}>
        {ACTIVITIES.map((a) => {
          const on = activity === a.key;
          return (
            <TouchableOpacity key={a.key} activeOpacity={0.7} onPress={() => setActivity(a.key)}
              style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : 'transparent' }}>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: on ? c.onAccent : c.sub }}>{t(a.labelKey)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Afronden */}
      <TouchableOpacity activeOpacity={0.85} onPress={handleFinish} disabled={saving}
        style={{ height: 52, borderRadius: 15, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: saving ? 0.7 : 1 }}>
        {saving ? <ActivityIndicator color={c.onAccent} /> : (
          <>
            <Text style={{ color: c.onAccent, fontSize: 16, fontWeight: '700' }}>{t('ob_finish')}</Text>
            <Icon name="chevR" size={18} color={c.onAccent} />
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
