// app/(tabs)/plan.tsx — Plan-tab
// Bovenaan sub-tabs (Overview/Workouts/Nutrition/Habits) die bepalen welke blokken
// zichtbaar zijn. Toont een weekstrip, de workout van vandaag, je voeding-voortgang
// en een afvinkbare gewoontes-lijst (habits). De vinkjes onthouden hun stand met useState.
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card, Section, Bar, Check } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, useAuth, useSettings, useDaily } from '@/components/store';
import { fetchAIWorkoutPlan } from '@/src/services/coachChat';
import { fetchMeals, todayKey } from '@/src/services/trackingService';
import type { AIWorkoutPlan } from '@/src/types/coach';

const TABS = ['Overview', 'Workouts', 'Nutrition', 'Habits'];

// Bouwt de huidige week (ma–zo) rond een gegeven dag: dagnaam, dag-van-de-maand,
// of het vandaag is en of de dag al voorbij is. Vervangt de vaste DATA.weekDays.
function buildWeek(base = new Date()) {
  const mondayOffset = (base.getDay() + 6) % 7; // 0 = zondag → 6 dagen na maandag
  const monday = new Date(base);
  monday.setDate(base.getDate() - mondayOffset);
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayStr = todayKey(base);
  const days = names.map((d, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    const key = todayKey(dt);
    return { d, n: dt.getDate(), today: key === todayStr, done: key < todayStr };
  });
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { days, label: `${fmt(monday)} – ${fmt(sunday)}` };
}

function SubTabs({ active, onChange }: { active: string; onChange: (t: string) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 22, borderBottomWidth: 1, borderBottomColor: c.line, marginBottom: 18, paddingHorizontal: 2 }}>
      {TABS.map((t) => {
        const on = active === t;
        return (
          <TouchableOpacity key={t} onPress={() => onChange(t)} activeOpacity={0.7} style={{ paddingBottom: 11 }}>
            <Text style={{ fontSize: 14.5, fontWeight: on ? '700' : '500', color: on ? c.text : c.sub }}>{t}</Text>
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
  const [tab, setTab] = useState('Overview');

  // De huidige week (herberekend per dag) voor de weekstrip.
  const week = useMemo(() => buildWeek(), []);

  // Sprint 8: het door de AI-coach gegenereerde/aangepaste workout-plan
  // (tabel workout_plans, geschreven via de tool update_workout_plan).
  const [aiPlan, setAiPlan] = useState<AIWorkoutPlan | null>(null);
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) { setAiPlan(null); return; }
    fetchAIWorkoutPlan(userId)
      .then((res) => setAiPlan(res?.plan ?? null))
      .catch(() => {});
  }, [session?.user?.id]);

  // Echte inname van vandaag (calorieën/eiwit) uit de gelogde maaltijden.
  const [consumed, setConsumed] = useState({ calories: 0, protein: 0 });
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) { setConsumed({ calories: 0, protein: 0 }); return; }
    fetchMeals(userId, todayKey())
      .then((meals) => setConsumed(meals.reduce(
        (a, m) => ({ calories: a.calories + m.calories, protein: a.protein + m.proteinG }),
        { calories: 0, protein: 0 }
      )))
      .catch(() => {});
  }, [session?.user?.id]);

  const showWorkout = tab === 'Overview' || tab === 'Workouts';
  const showNutri = tab === 'Overview' || tab === 'Nutrition';
  const showHabits = tab === 'Overview' || tab === 'Habits';

  const nutri = [
    { label: 'Calories', text: `${consumed.calories.toLocaleString()} / ${goals.calories.toLocaleString()} kcal`, v: consumed.calories, max: goals.calories, color: c.calories, icon: 'flame' as const },
    { label: 'Protein', text: `${consumed.protein} / ${goals.protein} g`, v: consumed.protein, max: goals.protein, color: c.protein, icon: 'target' as const },
    { label: 'Water', text: `${progress.waterL.toFixed(2)} / ${goals.water} L`, v: progress.waterL, max: goals.water, color: c.water, icon: 'droplet' as const },
  ];

  // Gewoontes afgeleid uit de echte dagvoortgang (Sprint 3), i.p.v. mock-data.
  const stepGoal = profileContext?.derived.stepGoal ?? goals.steps;
  const habits: { key: string; name: string; detail: string; icon: 'dumbbell' | 'footsteps' | 'droplet'; done: boolean; onToggle?: () => void }[] = [
    { key: 'workout', name: 'Complete workout', detail: progress.workoutDone ? 'Done' : 'Not yet', icon: 'dumbbell', done: progress.workoutDone, onToggle: toggleWorkout },
    { key: 'steps', name: `${stepGoal.toLocaleString()} Steps`, detail: `${progress.steps.toLocaleString()} / ${stepGoal.toLocaleString()}`, icon: 'footsteps', done: progress.steps >= stepGoal },
    { key: 'water', name: `Drink ${goals.water}L water`, detail: `${progress.waterL.toFixed(2)} / ${goals.water} L`, icon: 'droplet', done: progress.waterL >= goals.water },
  ];

  return (
    <Screen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: c.text, letterSpacing: -0.6, marginBottom: 16 }}>Plan</Text>
      <SubTabs active={tab} onChange={setTab} />

      {/* week strip */}
      <Card pad={14} style={{ marginBottom: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 11.5, color: c.sub, fontWeight: '600', letterSpacing: 0.4 }}>THIS WEEK</Text>
            <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.text, marginTop: 2 }}>{week.label}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['chevL', 'chevR'] as const).map((g) => (
              <TouchableOpacity key={g} style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: c.cardHi, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={g} size={15} color={c.sub} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {week.days.map((d) => (
            <View key={d.d} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
              <Text style={{ fontSize: 11, color: c.sub, fontWeight: '600' }}>{d.d}</Text>
              <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: d.today ? c.accent : 'transparent' }}>
                <Text style={{ fontWeight: d.today ? '800' : '600', fontSize: 13.5, color: d.today ? c.onAccent : c.text }}>{d.n}</Text>
              </View>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: d.done || d.today ? c.accent : c.faint }} />
            </View>
          ))}
        </View>
      </Card>

      {showWorkout ? (
        <>
          <Section title="Workout" />
          {aiPlan ? (
            <Card accent pad={15} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Icon name="sparkle" size={15} color={c.accentText} fill={c.accentText} />
                <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '800', color: c.accentText }}>AI Coach Plan</Text>
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
              <Text style={{ fontSize: 15.5, fontWeight: '700', color: c.text }}>Today's Workout</Text>
              <Text style={{ fontSize: 12.5, color: c.sub, marginTop: 2 }}>Tap to start or resume a session</Text>
            </View>
            <Icon name="chevR" size={20} color={c.dim} />
          </Card>
        </>
      ) : null}

      {showNutri ? (
        <>
          <Section title="Nutrition" action="Details" onAction={() => router.push('/nutrition')} />
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
          <Section title="Habits" />
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
