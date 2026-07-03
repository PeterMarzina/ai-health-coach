// app/onboarding.tsx — multi-step vragenlijst na registreren
// Verzamelt: naam, hoofddoel, fitness-niveau, huidige trainingsroutine,
// habits (slaap/stress/alcohol/roken), gewicht/lengte/activiteitsniveau.
// Bouwt daarna het "AI profile object" (src/services/aiProfile.ts), genereert
// een eerste rule-based advies (src/services/adviceGenerator.ts) en toont dat
// als laatste stap voordat je de app in gaat. Alles wordt opgeslagen in
// Supabase (`profiles`: full_name, health_goal, goals, measurements,
// profile_context).
import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useSettings, useAuth } from '@/components/store';
import { Card, Bar, Input } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { supabase } from '../src/lib/supabase';
import { DEFAULT_GOALS, DEFAULT_MEASUREMENTS } from '@/constants/data';
import { buildAIProfile } from '@/src/services/aiProfile';
import { generateAdvice } from '@/src/services/adviceGenerator';
import { getAIAdvice } from '@/src/services/aiAdvice';
import { generateFollowUpQuestions } from '@/src/services/followUpQuestions';
import { todayKey, logWeight } from '@/src/services/trackingService';
import type { FitnessLevel, Goal, RoutineType, ActivityLevel, FollowUpAnswer } from '@/src/types/aiProfile';

const GOALS = [
  { key: 'lose', labelKey: 'goal_lose', icon: 'flame' },
  { key: 'muscle', labelKey: 'goal_muscle', icon: 'dumbbell' },
  { key: 'fit', labelKey: 'goal_fit', icon: 'target' },
  { key: 'maintain', labelKey: 'goal_maintain', icon: 'leaf' },
] as const;

const LEVELS = [
  { key: 'beginner', labelKey: 'level_beginner' },
  { key: 'intermediate', labelKey: 'level_intermediate' },
  { key: 'advanced', labelKey: 'level_advanced' },
] as const;

const ROUTINE_TYPES = [
  { key: 'strength', labelKey: 'routine_strength' },
  { key: 'cardio', labelKey: 'routine_cardio' },
  { key: 'sports', labelKey: 'routine_sports' },
  { key: 'none', labelKey: 'routine_none' },
] as const;

const ACTIVITIES = [
  { key: 'low', labelKey: 'act_low' },
  { key: 'med', labelKey: 'act_med' },
  { key: 'high', labelKey: 'act_high' },
] as const;

const TOTAL_STEPS = 8;

export default function Onboarding() {
  const { c } = useTheme();
  const { t, lang, setLang } = useLang();
  const { setGoals, setMeasurements, setProfileContext } = useSettings();
  const { session, markOnboarded } = useAuth();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Tijdelijk, alleen om de Supabase Edge Function 'ai-advice' end-to-end te testen.
  const [aiTestLoading, setAiTestLoading] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<string | null>(null);

  // ── Antwoorden ──
  // Gebruikersnaam is gekozen bij registreren (opgeslagen in de auth user metadata);
  // hier vooringevuld en aanpasbaar, en pas bij "Klaar!" definitief in `profiles` gezet.
  const [username, setUsername] = useState('');
  useEffect(() => {
    const metaUsername = session?.user?.user_metadata?.username;
    if (metaUsername && !username) setUsername(metaUsername);
  }, [session]);

  // Real-time beschikbaarheid van de gebruikersnaam, gedebouncet zodat we niet
  // bij elke toetsaanslag een request sturen. Gebruikt dezelfde RPC als login
  // (get_email_by_username, zie 003_username.sql) — die kent zowel al-gecommitte
  // usernames (profiles) als nog-niet-afgeronde signups (auth metadata).
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  useEffect(() => {
    const trimmed = username.trim();
    if (trimmed.length < 3) { setUsernameStatus('idle'); return; }
    setUsernameStatus('checking');
    const handle = setTimeout(async () => {
      const { data, error } = await supabase.rpc('get_email_by_username', { p_username: trimmed });
      if (error) { setUsernameStatus('idle'); return; }
      const ownEmail = session?.user?.email?.toLowerCase();
      const taken = !!data && data.toLowerCase() !== ownEmail;
      setUsernameStatus(taken ? 'taken' : 'available');
    }, 500);
    return () => clearTimeout(handle);
  }, [username, session]);

  const [name, setName] = useState('');
  const [goal, setGoal] = useState<Goal | ''>('');
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel | ''>('');
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState<number | null>(null);
  const [routineTypes, setRoutineTypes] = useState<RoutineType[]>([]);
  const [sleepHours, setSleepHours] = useState('');
  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [alcohol, setAlcohol] = useState<boolean | null>(null);
  const [smoking, setSmoking] = useState<boolean | null>(null);
  const [curWeight, setCurWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | ''>('');
  // Antwoorden op de AI-gegenereerde (rule-based) vervolgvragen: optie-waarde per vraag-id.
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});

  const num = (s: string) => parseFloat(s.replace(',', '.')) || 0;

  // Vervolgvragen worden pas bepaald zodra de standaardvragen compleet zijn (stap 6),
  // en blijven nodig op stap 7 om de gegeven antwoorden in het AI-profiel te zetten.
  const followUpQuestions = step >= 6 ? generateFollowUpQuestions({
    goal: goal as Goal,
    fitnessLevel: fitnessLevel as FitnessLevel,
    trainingDaysPerWeek: trainingDaysPerWeek!,
    routineTypes,
    sleepHours: num(sleepHours),
    stressLevel: stressLevel!,
    activityLevel: activityLevel as ActivityLevel,
  }, lang) : [];

  const toggleRoutineType = (key: RoutineType) => {
    if (key === 'none') { setRoutineTypes(['none']); return; }
    setRoutineTypes((prev) => {
      const withoutNone = prev.filter((k) => k !== 'none');
      return withoutNone.includes(key) ? withoutNone.filter((k) => k !== key) : [...withoutNone, key];
    });
  };

  const stepValid = (): boolean => {
    switch (step) {
      case 0: return !!name && !!username && usernameStatus !== 'taken';
      case 1: return !!goal;
      case 2: return !!fitnessLevel;
      case 3: return trainingDaysPerWeek !== null && routineTypes.length > 0;
      case 4: return !!sleepHours && stressLevel !== null && alcohol !== null && smoking !== null;
      case 5: return num(curWeight) > 0 && num(targetWeight) > 0 && num(height) > 0 && num(age) > 0 && !!activityLevel;
      case 6: return followUpQuestions.every((q) => !!followUpAnswers[q.id]);
      default: return true;
    }
  };

  // Toont pas rode randen/foutteksten op numerieke velden nadat de gebruiker één
  // keer geprobeerd heeft door te gaan met die stap onvolledig — anders staat
  // een leeg veld meteen "fout" te zijn voordat er iets is ingevuld.
  const [showErrors, setShowErrors] = useState(false);
  const goNext = () => {
    if (!stepValid()) { setShowErrors(true); Alert.alert(t('oops'), t('ob_missing')); return; }
    setShowErrors(false);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };
  const goBack = () => { setShowErrors(false); setStep((s) => Math.max(s - 1, 0)); };

  // AI-profiel + advies worden pas gebouwd zodra alle antwoorden compleet zijn (stap 7, de samenvatting).
  const followUps: FollowUpAnswer[] = followUpQuestions
    .filter((q) => followUpAnswers[q.id])
    .map((q) => ({
      id: q.id,
      question: q.question,
      answer: followUpAnswers[q.id],
      answerLabel: q.options.find((o) => o.value === followUpAnswers[q.id])?.label ?? followUpAnswers[q.id],
    }));

  const aiProfile = step === 7 ? buildAIProfile({
    name,
    goal: goal as Goal,
    fitnessLevel: fitnessLevel as FitnessLevel,
    trainingDaysPerWeek: trainingDaysPerWeek!,
    routineTypes,
    sleepHours: num(sleepHours),
    stressLevel: stressLevel!,
    alcohol: alcohol!,
    smoking: smoking!,
    currentWeight: num(curWeight),
    targetWeight: num(targetWeight),
    height: num(height),
    age: num(age),
    activityLevel: activityLevel as ActivityLevel,
    followUps,
  }) : null;
  const advice = aiProfile ? generateAdvice(aiProfile, lang) : null;

  const handleTestAiAdvice = async () => {
    if (!aiProfile) return;
    setAiTestLoading(true);
    setAiTestResult(null);
    try {
      const text = await getAIAdvice(aiProfile, lang);
      setAiTestResult(text);
    } catch (e: any) {
      Alert.alert(t('err_title'), e.message ?? t('ob_ai_test_error'));
    } finally {
      setAiTestLoading(false);
    }
  };

  const handleFinish = async () => {
    if (!aiProfile) return;
    const { derived } = aiProfile;

    const newGoals = {
      ...DEFAULT_GOALS,
      calories: derived.calorieTarget,
      protein: derived.proteinTargetG,
      carbs: derived.carbsTargetG,
      fats: derived.fatsTargetG,
      water: derived.waterTargetL,
      sleepHours: derived.sleepTargetHours,
      steps: derived.stepGoal,
      weightTarget: num(targetWeight),
    };
    const newMeasurements = { ...DEFAULT_MEASUREMENTS, weight: num(curWeight), height: num(height) };

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      // Profiel + doelen + metingen + AI-profiel-context in één keer opslaan in Supabase.
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        username: username.trim().toLowerCase(),
        full_name: name,
        health_goal: goal,
        goals: newGoals,
        measurements: newMeasurements,
        profile_context: aiProfile,
        updated_at: new Date(),
      });
      if (error) {
        if (error.code === '23505') throw new Error(t('ob_username_taken'));
        throw error;
      }
      // Startpunt voor de gewicht-grafiek op Progress — anders is die leeg tot de
      // eerste handmatige log. Best-effort: mag de onboarding niet blokkeren.
      await logWeight(user.id, todayKey(), num(curWeight)).catch(() => {});

      setGoals(newGoals);
      setMeasurements(newMeasurements);
      setProfileContext(aiProfile);

      markOnboarded();
    } catch (e: any) {
      Alert.alert(t('err_title'), e.message);
    } finally {
      setSaving(false);
    }
  };

  const Header = () => (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
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
      <Text style={{ fontSize: 12.5, color: c.sub, fontWeight: '600', marginBottom: 8 }}>
        {t('ob_step')} {Math.min(step + 1, TOTAL_STEPS)} / {TOTAL_STEPS}
      </Text>
      <Bar value={step + 1} max={TOTAL_STEPS} height={6} />
      <View style={{ height: 22 }} />
    </>
  );

  const Nav = ({ finalLabel }: { finalLabel?: string }) => (
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 30 }}>
      {step > 0 ? (
        <TouchableOpacity activeOpacity={0.85} onPress={goBack}
          style={{ height: 52, paddingHorizontal: 20, borderRadius: 15, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
          <Icon name="chevL" size={18} color={c.text} />
          <Text style={{ color: c.text, fontSize: 15, fontWeight: '700' }}>{t('ob_back')}</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity activeOpacity={0.85} onPress={step === 7 ? handleFinish : goNext} disabled={saving}
        style={{ flex: 1, height: 52, borderRadius: 15, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: saving ? 0.7 : 1 }}>
        {saving ? <ActivityIndicator color={c.onAccent} /> : (
          <>
            <Text style={{ color: c.onAccent, fontSize: 16, fontWeight: '700' }}>{finalLabel ?? t('ob_next')}</Text>
            <Icon name="chevR" size={18} color={c.onAccent} />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Header />

      {step === 0 && (
        <>
          <Text style={{ fontSize: 26, fontWeight: '800', color: c.text, letterSpacing: -0.5 }}>{t('ob_title')}</Text>
          <Text style={{ fontSize: 13.5, color: c.sub, marginTop: 6, marginBottom: 24 }}>{t('ob_subtitle')}</Text>
          <Input
            label={t('ob_username_label')}
            placeholder={t('ob_username_ph')}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ marginBottom: 6 }}
          />
          {usernameStatus === 'checking' ? (
            <Text style={{ fontSize: 12, color: c.dim, marginBottom: 12, marginLeft: 2 }}>{t('ob_username_checking')}</Text>
          ) : usernameStatus === 'available' ? (
            <Text style={{ fontSize: 12, color: c.accentText, fontWeight: '600', marginBottom: 12, marginLeft: 2 }}>{t('ob_username_available')}</Text>
          ) : usernameStatus === 'taken' ? (
            <Text style={{ fontSize: 12, color: c.bad, fontWeight: '600', marginBottom: 12, marginLeft: 2 }}>{t('ob_username_taken')}</Text>
          ) : (
            <View style={{ marginBottom: 12 }} />
          )}
          <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{t('ob_name_label')}</Text>
          <TextInput
            placeholder={t('ob_name_ph')}
            placeholderTextColor={c.dim}
            value={name}
            onChangeText={setName}
            style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: c.text }}
          />
        </>
      )}

      {step === 1 && (
        <>
          <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{t('ob_goal_label')}</Text>
          <View style={{ gap: 9 }}>
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
        </>
      )}

      {step === 2 && (
        <>
          <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{t('ob_level_label')}</Text>
          <View style={{ gap: 9 }}>
            {LEVELS.map((lvl) => {
              const on = fitnessLevel === lvl.key;
              return (
                <TouchableOpacity key={lvl.key} activeOpacity={0.7} onPress={() => setFitnessLevel(lvl.key)}
                  style={{ paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : 'transparent' }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: on ? c.onAccent : c.text }}>{t(lvl.labelKey)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {step === 3 && (
        <>
          <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{t('ob_routine_label')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => {
              const on = trainingDaysPerWeek === d;
              return (
                <TouchableOpacity key={d} activeOpacity={0.7} onPress={() => setTrainingDaysPerWeek(d)}
                  style={{ flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : 'transparent' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: on ? c.onAccent : c.sub }}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{t('ob_routine_types_label')}</Text>
          <View style={{ gap: 9 }}>
            {ROUTINE_TYPES.map((rt) => {
              const on = routineTypes.includes(rt.key);
              return (
                <TouchableOpacity key={rt.key} activeOpacity={0.7} onPress={() => toggleRoutineType(rt.key)}
                  style={{ paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accentSoft : 'transparent' }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>{t(rt.labelKey)}</Text>
                  {on ? <Icon name="check" size={18} color={c.accentText} strokeWidth={2.6} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {step === 4 && (
        <>
          <Text style={{ fontSize: 20, fontWeight: '800', color: c.text, marginBottom: 20 }}>{t('ob_habits_title')}</Text>

          <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{t('ob_sleep_label')}</Text>
          <TextInput value={sleepHours} onChangeText={setSleepHours} keyboardType="numeric" placeholder="7" placeholderTextColor={c.dim}
            style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: c.text, marginBottom: 22 }} />

          <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{t('ob_stress_label')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 22 }}>
            {[1, 2, 3, 4, 5].map((lvl) => {
              const on = stressLevel === lvl;
              return (
                <TouchableOpacity key={lvl} activeOpacity={0.7} onPress={() => setStressLevel(lvl)}
                  style={{ flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : 'transparent' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: on ? c.onAccent : c.sub }}>{lvl}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{t('ob_alcohol_label')}</Text>
          <View style={{ flexDirection: 'row', gap: 9, marginBottom: 22 }}>
            {[{ v: true, k: 'yes' }, { v: false, k: 'no' }].map((opt) => {
              const on = alcohol === opt.v;
              return (
                <TouchableOpacity key={opt.k} activeOpacity={0.7} onPress={() => setAlcohol(opt.v)}
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : 'transparent' }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: on ? c.onAccent : c.sub }}>{t(opt.k as any)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{t('ob_smoking_label')}</Text>
          <View style={{ flexDirection: 'row', gap: 9 }}>
            {[{ v: true, k: 'yes' }, { v: false, k: 'no' }].map((opt) => {
              const on = smoking === opt.v;
              return (
                <TouchableOpacity key={opt.k} activeOpacity={0.7} onPress={() => setSmoking(opt.v)}
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : 'transparent' }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: on ? c.onAccent : c.sub }}>{t(opt.k as any)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {step === 5 && (
        <>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 22 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{t('ob_curweight')}</Text>
              <TextInput value={curWeight} onChangeText={setCurWeight} keyboardType="numeric" placeholder="78" placeholderTextColor={c.dim}
                style={{ backgroundColor: c.card, borderWidth: 1, borderColor: showErrors && num(curWeight) <= 0 ? c.bad : c.line, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: c.text }} />
              {showErrors && num(curWeight) <= 0 ? <Text style={{ fontSize: 11, color: c.bad, marginTop: 5 }}>{t('ob_num_invalid')}</Text> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{t('ob_targetweight')}</Text>
              <TextInput value={targetWeight} onChangeText={setTargetWeight} keyboardType="numeric" placeholder="75" placeholderTextColor={c.dim}
                style={{ backgroundColor: c.card, borderWidth: 1, borderColor: showErrors && num(targetWeight) <= 0 ? c.bad : c.line, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: c.text }} />
              {showErrors && num(targetWeight) <= 0 ? <Text style={{ fontSize: 11, color: c.bad, marginTop: 5 }}>{t('ob_num_invalid')}</Text> : null}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 22 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{t('ob_height')}</Text>
              <TextInput value={height} onChangeText={setHeight} keyboardType="numeric" placeholder="180" placeholderTextColor={c.dim}
                style={{ backgroundColor: c.card, borderWidth: 1, borderColor: showErrors && num(height) <= 0 ? c.bad : c.line, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: c.text }} />
              {showErrors && num(height) <= 0 ? <Text style={{ fontSize: 11, color: c.bad, marginTop: 5 }}>{t('ob_num_invalid')}</Text> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{t('ob_age')}</Text>
              <TextInput value={age} onChangeText={setAge} keyboardType="numeric" placeholder="30" placeholderTextColor={c.dim}
                style={{ backgroundColor: c.card, borderWidth: 1, borderColor: showErrors && num(age) <= 0 ? c.bad : c.line, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: c.text }} />
              {showErrors && num(age) <= 0 ? <Text style={{ fontSize: 11, color: c.bad, marginTop: 5 }}>{t('ob_num_invalid')}</Text> : null}
            </View>
          </View>

          <Text style={{ fontSize: 13, color: c.sub, fontWeight: '600', marginBottom: 8 }}>{t('ob_activity')}</Text>
          <View style={{ flexDirection: 'row', gap: 9 }}>
            {ACTIVITIES.map((a) => {
              const on = activityLevel === a.key;
              return (
                <TouchableOpacity key={a.key} activeOpacity={0.7} onPress={() => setActivityLevel(a.key)}
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : 'transparent' }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: on ? c.onAccent : c.sub }}>{t(a.labelKey)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {step === 6 && (
        <>
          <Text style={{ fontSize: 20, fontWeight: '800', color: c.text, marginBottom: 6 }}>{t('ob_followup_title')}</Text>
          <Text style={{ fontSize: 13.5, color: c.sub, marginBottom: 20 }}>{t('ob_followup_subtitle')}</Text>
          {followUpQuestions.length === 0 ? (
            <Text style={{ fontSize: 13.5, color: c.sub }}>{t('ob_followup_none')}</Text>
          ) : (
            <View style={{ gap: 22 }}>
              {followUpQuestions.map((q) => (
                <View key={q.id}>
                  <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.text, marginBottom: 10 }}>{q.question}</Text>
                  <View style={{ gap: 9 }}>
                    {q.options.map((opt) => {
                      const on = followUpAnswers[q.id] === opt.value;
                      return (
                        <TouchableOpacity key={opt.value} activeOpacity={0.7}
                          onPress={() => setFollowUpAnswers((prev) => ({ ...prev, [q.id]: opt.value }))}
                          style={{ paddingVertical: 13, paddingHorizontal: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accentSoft : 'transparent' }}>
                          <Text style={{ fontSize: 14.5, fontWeight: '600', color: c.text }}>{opt.label}</Text>
                          {on ? <Icon name="check" size={18} color={c.accentText} strokeWidth={2.6} /> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {step === 7 && advice && (
        <>
          <Text style={{ fontSize: 26, fontWeight: '800', color: c.text, letterSpacing: -0.5, marginBottom: 16 }}>{t('ob_summary_title')}</Text>
          <Card accent pad={18}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Icon name="sparkle" size={16} color={c.accentText} fill={c.accentText} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: c.accentText }}>{advice.title}</Text>
            </View>
            <Text style={{ fontSize: 14.5, color: c.text, lineHeight: 21 }}>{advice.body}</Text>
          </Card>

          {/* Tijdelijke test-knop voor de Supabase Edge Function 'ai-advice'. */}
          <TouchableOpacity activeOpacity={0.85} onPress={handleTestAiAdvice} disabled={aiTestLoading}
            style={{ marginTop: 14, height: 46, borderRadius: 13, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: aiTestLoading ? 0.6 : 1 }}>
            {aiTestLoading ? <ActivityIndicator color={c.text} /> : (
              <>
                <Icon name="sparkle" size={15} color={c.accentText} fill={c.accentText} />
                <Text style={{ color: c.text, fontSize: 13.5, fontWeight: '700' }}>{t('ob_ai_test_btn')}</Text>
              </>
            )}
          </TouchableOpacity>

          {aiTestResult ? (
            <Card pad={16} style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 14, color: c.text, lineHeight: 20 }}>{aiTestResult}</Text>
            </Card>
          ) : null}
        </>
      )}

      <Nav finalLabel={step === 7 ? t('ob_finish') : undefined} />
    </ScrollView>
  );
}
