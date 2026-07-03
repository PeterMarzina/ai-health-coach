// app/plan/workout.tsx — Workout-sessiescherm
// Geen actieve sessie? Kies een template (Push/Pull/Legs/Full Body) en start.
// Wel een actieve sessie? Toon de live timer + het gegenereerde plan; tik een
// oefening aan om sets/reps/gewicht te loggen (app/plan/workout-log.tsx).
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Card } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, useAuth, useDaily } from '@/components/store';
import {
  startWorkoutSession,
  endWorkoutSession,
  fetchActiveSession,
  fetchSessionExercises,
  fetchSessionSetCounts,
} from '@/src/services/workouts';
import type { PlannedExercise, TemplateKey, WorkoutSession } from '@/src/types/workout';

const TEMPLATES: { key: TemplateKey; label: string }[] = [
  { key: 'push', label: 'Push' },
  { key: 'pull', label: 'Pull' },
  { key: 'legs', label: 'Legs' },
  { key: 'full_body', label: 'Full Body' },
];

function fmt(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${h ? h + ':' : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function WorkoutDetail() {
  const { c } = useTheme();
  const { session: authSession } = useAuth();
  const { progress: dailyProgress, toggleWorkout } = useDaily();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = authSession?.user.id ?? null;

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [template, setTemplate] = useState<TemplateKey>('push');
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [plan, setPlan] = useState<PlannedExercise[]>([]);
  const [setCounts, setSetCounts] = useState<Record<string, number>>({});
  const [secs, setSecs] = useState(0);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const active = await fetchActiveSession(userId);
      if (active) {
        const [exercises, counts] = await Promise.all([
          fetchSessionExercises(active.id),
          fetchSessionSetCounts(active.id),
        ]);
        setSession(active);
        setPlan(exercises);
        setSetCounts(counts);
      } else {
        setSession(null);
        setPlan([]);
        setSetCounts({});
      }
    } catch (e: any) {
      Alert.alert('Oops', e.message ?? 'Could not load workout.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!session) { setSecs(0); return; }
    const startedMs = new Date(session.startedAt).getTime();
    const tick = () => setSecs(Math.max(0, Math.floor((Date.now() - startedMs) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session]);

  const handleStart = async () => {
    if (!userId) return;
    setStarting(true);
    try {
      const { session: newSession, plan: newPlan } = await startWorkoutSession(userId, template);
      setSession(newSession);
      setPlan(newPlan);
      setSetCounts({});
    } catch (e: any) {
      Alert.alert('Oops', e.message ?? 'Could not start workout.');
    } finally {
      setStarting(false);
    }
  };

  // Geen Alert.alert-bevestiging hier: react-native-web's Alert is een no-op
  // op web (Expo Web) — een multi-button confirm-dialog zou daar nooit
  // verschijnen en de actie zou dus nooit uitgevoerd worden.
  const handleEnd = async () => {
    if (!session) return;
    try {
      await endWorkoutSession(session.id);
      // Telt mee voor de dagscore/streak/XP (Sprint 3) — alleen togglen als
      // "workout" vandaag nog niet als gedaan staat.
      if (!dailyProgress.workoutDone) toggleWorkout();
      setSession(null);
      setPlan([]);
      setSetCounts({});
    } catch (e: any) {
      Alert.alert('Oops', e.message ?? 'Could not end workout.');
    }
  };

  const doneCount = plan.filter((p) => (setCounts[p.exercise.id] ?? 0) >= p.targetSets).length;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Icon name="chevL" size={19} color={c.text} />
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color={c.accent} style={{ marginTop: 60 }} />
        ) : !session ? (
          <>
            <Text style={{ fontSize: 26, fontWeight: '800', color: c.text, letterSpacing: -0.6, marginBottom: 6 }}>Start a Workout</Text>
            <Text style={{ fontSize: 13, color: c.sub, marginBottom: 20, lineHeight: 18 }}>Pick a split — we'll build the exercise list for you.</Text>

            <View style={{ gap: 10, marginBottom: 24 }}>
              {TEMPLATES.map((t) => (
                <Card key={t.key} onPress={() => setTemplate(t.key)} pad={14} accent={template === t.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: template === t.key ? c.accentSoft : c.cardHi, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="dumbbell" size={19} color={template === t.key ? c.accentText : c.sub} />
                  </View>
                  <Text style={{ fontSize: 15.5, fontWeight: '700', color: c.text, flex: 1 }}>{t.label}</Text>
                  {template === t.key ? <Icon name="check" size={18} color={c.accentText} /> : null}
                </Card>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={{ marginBottom: 18 }}>
              <Text style={{ fontSize: 26, fontWeight: '800', color: c.text, letterSpacing: -0.6 }}>{session.name}</Text>
              <Text style={{ fontSize: 13, color: c.sub, marginTop: 3 }}>{plan.length} exercises</Text>
            </View>

            <Card pad={16} style={{ marginBottom: 18, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: c.sub, marginBottom: 12 }}>ELAPSED TIME</Text>
              <Text style={{ fontSize: 48, fontWeight: '800', color: c.accentText, fontFamily: 'monospace', letterSpacing: -1 }}>{fmt(secs)}</Text>
            </Card>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 2, marginBottom: 12 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Exercises</Text>
              <Text style={{ fontSize: 12.5, color: c.sub, fontWeight: '600' }}>{doneCount}/{plan.length} done</Text>
            </View>

            {plan.map((p, i) => {
              const logged = setCounts[p.exercise.id] ?? 0;
              const isDone = logged >= p.targetSets;
              return (
                <Card
                  key={p.exercise.id}
                  onPress={() => router.push({
                    pathname: '/plan/workout-log',
                    params: {
                      sessionId: session.id,
                      exerciseId: p.exercise.id,
                      exerciseName: p.exercise.name,
                      targetSets: String(p.targetSets),
                      targetReps: p.targetReps,
                    },
                  })}
                  pad={11}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 10, opacity: isDone ? 0.7 : 1 }}
                >
                  <Text style={{ width: 22, textAlign: 'center', fontSize: 17, fontWeight: '800', color: isDone ? c.accentText : c.dim }}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.text, textDecorationLine: isDone ? 'line-through' : 'none', textDecorationColor: c.dim }}>{p.exercise.name}</Text>
                    <Text style={{ fontSize: 12, color: c.sub, marginTop: 2 }}>{p.targetSets} sets · {p.targetReps} reps</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: isDone ? c.accentText : c.sub }}>{logged}/{p.targetSets}</Text>
                  <Icon name="chevR" size={18} color={c.dim} />
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>

      {!loading ? (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.line }}>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={starting}
            onPress={session ? handleEnd : handleStart}
            style={{
              width: '100%', height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
              backgroundColor: session ? 'transparent' : c.accent,
              borderWidth: session ? 1 : 0,
              borderColor: c.bad,
              opacity: starting ? 0.7 : 1,
            }}
          >
            <Icon name={session ? 'stop' : 'dumbbell'} size={20} color={session ? c.bad : c.onAccent} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: session ? c.bad : c.onAccent }}>
              {starting ? 'Starting…' : session ? 'End Workout' : 'Start Workout'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
