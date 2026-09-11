// app/(tabs)/plan.tsx — Plan-tab
// Bovenaan sub-tabs (Overview/Workouts/Nutrition/Habits) die bepalen welke blokken
// zichtbaar zijn. Toont een weekstrip, de workout van vandaag, je voeding-voortgang
// en een afvinkbare gewoontes-lijst (habits) op basis van de echte dagvoortgang.
import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card, Section, Bar, Check } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, useAuth, useSettings, useDaily, useLang } from '@/components/store';
import { fetchAIWorkoutPlan } from '@/src/services/coachChat';
import { fetchMeals, todayKey } from '@/src/services/trackingService';
import type { AIWorkoutPlan } from '@/src/types/coach';
import { supabase } from '@/src/lib/supabase';
import type { TKey } from '@/constants/i18n';

type PlanTab = 'overview' | 'workouts' | 'nutrition' | 'habits';
const TABS: { id: PlanTab; label: TKey }[] = [
  { id: 'overview', label: 'plan_tab_overview' },
  { id: 'workouts', label: 'workouts' },
  { id: 'nutrition', label: 'nutrition' },
  { id: 'habits', label: 'habits' },
];

// Bouwt de huidige week (ma–zo) rond een gegeven dag: dagnaam, dag-van-de-maand,
// datum-key en of het vandaag is. Of er die dag iets gedaan is, komt uit daily_progress.
function buildWeek(locale: string, base = new Date()) {
  const mondayOffset = (base.getDay() + 6) % 7; // 0 = zondag → 6 dagen na maandag
  const monday = new Date(base);
  monday.setDate(base.getDate() - mondayOffset);
  const todayStr = todayKey(base);
  const days = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    const key = todayKey(dt);
    return { d: dt.toLocaleDateString(locale, { weekday: 'short' }), n: dt.getDate(), key, today: key === todayStr };
  });
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (dt: Date) => dt.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  return { days, label: `${fmt(monday)} – ${fmt(sunday)}` };
}

function SubTabs({ active, onChange }: { active: PlanTab; onChange: (tab: PlanTab) => void }) {
  const { c } = useTheme();
  const { t } = useLang();
  return (
    <View style={{ flexDirection: 'row', gap: 22, borderBottomWidth: 1, borderBottomColor: c.line, marginBottom: 18, paddingHorizontal: 2 }}>
      {TABS.map((tab) => {
        const on = active === tab.id;
        return (
          <TouchableOpacity key={tab.id} onPress={() => onChange(tab.id)} activeOpacity={0.7} style={{ paddingBottom: 11 }}>
            <Text style={{ fontSize: 14.5, fontWeight: on ? '700' : '500', color: on ? c.text : c.sub }}>{t(tab.label)}</Text>
            {on ? <View style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2.5, borderRadius: 3, backgroundColor: c.accent }} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function Plan() {
  const { c } = useTheme();
  const router = useRouter();
  const { goals, profileContext } = useSettings();
  const { session } = useAuth();
  const { progress, toggleWorkout } = useDaily();
  const { t, locale } = useLang();
  const [tab, setTab] = useState<PlanTab>('overview');

  // De huidige week voor de weekstrip (dagnamen in de gekozen taal).
  const week = useMemo(() => buildWeek(locale), [locale]);

  // Alles wat op andere schermen verandert, opnieuw laden zodra deze tab in beeld komt:
  // maaltijden (Nutrition), het plan (de AI-coach past het aan) en de weekactiviteit.
  const userId = session?.user?.id;
  const [activeDates, setActiveDates] = useState<Set<string>>(new Set());
  const [aiPlan, setAiPlan] = useState<AIWorkoutPlan | null>(null);
  const [consumed, setConsumed] = useState({ calories: 0, protein: 0 });
  useFocusEffect(useCallback(() => {
    if (!userId) return;

    // Dagen van deze week met activiteit (workout, stappen of water) — het stipje onder de dag.
    supabase
      .from('daily_progress')
      .select('date, workout_done, steps, water_l')
      .eq('user_id', userId)
      .gte('date', week.days[0].key)
      .lte('date', week.days[6].key)
      .then(({ data }) => setActiveDates(new Set(
        (data ?? [])
          .filter((r: any) => r.workout_done || r.steps > 0 || Number(r.water_l) > 0)
          .map((r: any) => r.date)
      )));

    // Sprint 8: het door de AI-coach gegenereerde/aangepaste workout-plan
    // (tabel workout_plans, geschreven via de tool update_workout_plan).
    fetchAIWorkoutPlan(userId)
      .then((res) => setAiPlan(res?.plan ?? null))
      .catch(() => {});

    // Echte inname van vandaag (calorieën/eiwit) uit de gelogde maaltijden.
    fetchMeals(userId, todayKey())
      .then((meals) => setConsumed(meals.reduce(
        (a, m) => ({ calories: a.calories + m.calories, protein: a.protein + m.proteinG }),
        { calories: 0, protein: 0 }
      )))
      .catch(() => {});
  }, [userId, week]));
  // Vandaag komt live uit useDaily (de +-knoppen werken direct, zonder herladen).
  const todayActive = progress.workoutDone || progress.steps > 0 || progress.waterL > 0;

  const showWorkout = tab === 'overview' || tab === 'workouts';
  const showNutri = tab === 'overview' || tab === 'nutrition';
  const showHabits = tab === 'overview' || tab === 'habits';

  const num = (n: number) => n.toLocaleString(locale);
  const litres = (n: number) => num(Math.round(n * 100) / 100);
  const nutri = [
    { label: t('calories'), text: `${num(consumed.calories)} / ${num(goals.calories)} kcal`, v: consumed.calories, max: goals.calories, color: c.calories, icon: 'flame' as const },
    { label: t('protein'), text: `${num(consumed.protein)} / ${num(goals.protein)} g`, v: consumed.protein, max: goals.protein, color: c.protein, icon: 'target' as const },
    { label: t('water'), text: `${litres(progress.waterL)} / ${litres(goals.water)} L`, v: progress.waterL, max: goals.water, color: c.water, icon: 'droplet' as const },
  ];

  // Gewoontes afgeleid uit de echte dagvoortgang (Sprint 3), i.p.v. mock-data.
  const stepGoal = profileContext?.derived.stepGoal ?? goals.steps;
  const habits: { key: string; name: string; detail: string; icon: 'dumbbell' | 'footsteps' | 'droplet'; done: boolean; onToggle?: () => void }[] = [
    { key: 'workout', name: t('habit_complete_workout'), detail: progress.workoutDone ? t('done') : t('not_yet'), icon: 'dumbbell', done: progress.workoutDone, onToggle: toggleWorkout },
    { key: 'steps', name: `${num(stepGoal)} ${t('steps_unit')}`, detail: `${num(progress.steps)} / ${num(stepGoal)}`, icon: 'footsteps', done: progress.steps >= stepGoal },
    { key: 'water', name: t('habit_water').replace('{liters}', litres(goals.water)), detail: `${litres(progress.waterL)} / ${litres(goals.water)} L`, icon: 'droplet', done: progress.waterL >= goals.water },
  ];

  return (
    <Screen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: c.text, letterSpacing: -0.6, marginBottom: 16 }}>{t('plan')}</Text>
      <SubTabs active={tab} onChange={setTab} />

      {/* week strip */}
      <Card pad={14} style={{ marginBottom: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 11.5, color: c.sub, fontWeight: '600', letterSpacing: 0.4 }}>{t('this_week')}</Text>
            <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.text, marginTop: 2 }}>{week.label}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {week.days.map((d) => (
            <View key={d.key} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
              <Text style={{ fontSize: 11, color: c.sub, fontWeight: '600' }}>{d.d}</Text>
              <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: d.today ? c.accent : 'transparent' }}>
                <Text style={{ fontWeight: d.today ? '800' : '600', fontSize: 13.5, color: d.today ? c.onAccent : c.text }}>{d.n}</Text>
              </View>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: (d.today ? todayActive : activeDates.has(d.key)) ? c.accent : c.faint }} />
            </View>
          ))}
        </View>
      </Card>

      {showWorkout ? (
        <>
          <Section title={t('workout')} />
          {aiPlan ? (
            <Card accent pad={15} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Icon name="sparkle" size={15} color={c.accentText} fill={c.accentText} />
                <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '800', color: c.accentText }}>{t('ai_coach_plan')}</Text>
                <Text style={{ fontSize: 12, color: c.sub }}>{aiPlan.daysPerWeek}x / week</Text>
              </View>
              <View style={{ gap: 10 }}>
                {aiPlan.days.map((day, i) => (
                  <View key={`${day.name}-${i}`}>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: c.text }}>
                      {day.name}{day.focus ? <Text style={{ fontWeight: '500', color: c.sub }}>  ·  {day.focus}</Text> : null}
                    </Text>
                    {day.exercises.map((ex, j) => (
                      <Text key={`${ex.name}-${j}`} style={{ fontSize: 12.5, color: c.sub, marginTop: 2, marginLeft: 8 }}>
                        {ex.name} — {ex.sets} × {ex.reps}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
              {aiPlan.notes ? (
                <Text style={{ fontSize: 12, color: c.sub, marginTop: 10, fontStyle: 'italic' }}>{aiPlan.notes}</Text>
              ) : null}
            </Card>
          ) : null}
          <Card onPress={() => router.push('/plan/workout')} pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 18 }}>
            <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="target" size={24} color={c.accentText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15.5, fontWeight: '700', color: c.text }}>{t('todays_workout')}</Text>
              <Text style={{ fontSize: 12.5, color: c.sub, marginTop: 2 }}>{t('todays_workout_sub')}</Text>
            </View>
            <Icon name="chevR" size={20} color={c.dim} />
          </Card>
        </>
      ) : null}

      {showNutri ? (
        <>
          <Section title={t('nutrition')} action={t('details')} onAction={() => router.push('/nutrition')} />
          <Card onPress={() => router.push('/nutrition')} pad={15} style={{ marginBottom: 18, gap: 15 }}>
            {nutri.map((r) => (
              <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c.cardHi, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={r.icon} size={17} color={r.color} fill={r.icon === 'flame' || r.icon === 'droplet' ? r.color : undefined} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>{r.label}</Text>
                    <Text style={{ fontSize: 12, color: c.sub }}>{r.text}</Text>
                  </View>
                  <Bar value={r.v} max={r.max} color={r.color} />
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {showHabits ? (
        <>
          <Section title={t('habits')} />
          <Card pad={6}>
            {habits.map((h, i) => (
              <View key={h.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: i < habits.length - 1 ? 1 : 0, borderBottomColor: c.line }}>
                <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: c.cardHi, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={h.icon} size={18} color={h.done ? c.accentText : c.sub} fill={h.icon === 'droplet' && h.done ? c.accentText : undefined} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '600', color: c.text }}>{h.name}</Text>
                  <Text style={{ fontSize: 12, color: c.sub, marginTop: 1 }}>{h.detail}</Text>
                </View>
                <Check on={h.done} onToggle={h.onToggle} />
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
