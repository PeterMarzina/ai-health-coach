// app/plan/workout.tsx — Actieve sessie-scherm (Deel A1)
// Geen actieve sessie? Kies "Empty Workout" of een routine (A3) om te starten.
// Wel een actieve sessie? Toon de live timer + volume, de rusttimer, en per
// oefening een inline setrij (kg × reps, vorige prestatie, auto-fill, checkbox).
// Crash-safety + sync leven in src/services/workoutSession.ts — dit scherm
// houdt alleen de teruggegeven state in React bij.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Card, Button, Check, EmptyState } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, useAuth, useDaily } from '@/components/store';
import {
  resumeActiveSession, startSession, addExerciseToSession, removeExerciseFromSession,
  logSet, removeSet, startRestTimer, clearRestTimer, endSession, abandonSession,
} from '@/src/services/workoutSession';
import { fetchExercisesByIds, fetchPreviousExerciseSets } from '@/src/services/workouts';
import { fetchRoutines, fetchRoutineExercises } from '@/src/services/routines';
import type { LocalSessionState, LocalSet } from '@/src/services/localSession';
import type { Exercise, LoggedSet, Routine, SetType } from '@/src/types/workout';

const SET_TYPE_ORDER: SetType[] = ['normal', 'warmup', 'drop', 'failure'];
const SET_TYPE_LABEL: Record<SetType, string> = { normal: 'Normal', warmup: 'Warm-up', drop: 'Drop', failure: 'Failure' };

function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${h ? h + ':' : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`;
}

type SetRowVM = { index: number; setNumber: number; logged: LocalSet | null; previous: { weightKg: number; reps: number } | null };

function buildRows(sessionSets: LocalSet[], exerciseId: string, targetSets: number, manualExtra: number, previous: LoggedSet[]): SetRowVM[] {
  const logged = sessionSets.filter((s) => s.exerciseId === exerciseId).sort((a, b) => a.setNumber - b.setNumber);
  const rowCount = Math.max(targetSets, logged.length, manualExtra);
  const rows: SetRowVM[] = [];
  for (let i = 0; i < rowCount; i++) {
    const prev = previous[i];
    rows.push({
      index: i,
      setNumber: i + 1,
      logged: logged[i] ?? null,
      previous: prev ? { weightKg: prev.weightKg, reps: prev.reps } : null,
    });
  }
  return rows;
}

function setTypeColor(c: any, type: SetType): string {
  if (type === 'warmup') return c.dim;
  if (type === 'drop') return c.protein;
  if (type === 'failure') return c.bad;
  return c.sub;
}

export default function WorkoutSessionScreen() {
  const { c } = useTheme();
  const { session: authSession } = useAuth();
  const { progress: dailyProgress, toggleWorkout } = useDaily();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = authSession?.user.id ?? null;
  const params = useLocalSearchParams<{ pickedExerciseId?: string; pickedAt?: string; startRoutineId?: string; startRoutineName?: string }>();

  const [loadingStart, setLoadingStart] = useState(true);
  const [pendingResume, setPendingResume] = useState<LocalSessionState | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [starting, setStarting] = useState(false);

  const [session, setSession] = useState<LocalSessionState | null>(null);
  const [exercisesById, setExercisesById] = useState<Record<string, Exercise>>({});
  const [previousByExercise, setPreviousByExercise] = useState<Record<string, LoggedSet[]>>({});
  const [manualRowCount, setManualRowCount] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, { weight: string; reps: string; setType: SetType }>>({});
  const [confirmRemoveExerciseId, setConfirmRemoveExerciseId] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [ending, setEnding] = useState(false);
  const [now, setNow] = useState(Date.now());

  // ── Laden: kijk of er een sessie te hervatten valt, anders toon routines ──
  // Komt hier binnen vanaf de routines-lijst (A3) met startRoutineId/-Name?
  // Dan die routine direct starten i.p.v. nogmaals de lijst te tonen.
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoadingStart(true);
      try {
        const resumed = await resumeActiveSession(userId);
        if (resumed) {
          setPendingResume(resumed);
        } else if (params.startRoutineId && params.startRoutineName) {
          router.setParams({ startRoutineId: undefined, startRoutineName: undefined });
          await handleStartFromRoutine({ id: params.startRoutineId, name: params.startRoutineName, isTemplate: false });
        } else {
          setRoutines(await fetchRoutines(userId));
        }
      } catch (e: any) {
        Alert.alert('Oops', e.message ?? 'Could not load your workout.');
      } finally {
        setLoadingStart(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Klok voor de sessie-timer + rusttimer-countdown.
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [!!session]);

  // Rusttimer die vanzelf afloopt.
  useEffect(() => {
    if (!session?.restTimer) return;
    const remaining = new Date(session.restTimer.endsAt).getTime() - now;
    if (remaining <= 0) clearRestTimer(session).then(setSession);
  }, [now]);

  const hydrateExerciseData = useCallback(async (sessionId: string, uid: string, exerciseIds: string[]) => {
    if (exerciseIds.length === 0) return;
    try {
      const [exList, prevPairs] = await Promise.all([
        fetchExercisesByIds(exerciseIds),
        Promise.all(exerciseIds.map(async (id) => [id, await fetchPreviousExerciseSets(uid, id, sessionId)] as const)),
      ]);
      setExercisesById((prev) => { const next = { ...prev }; for (const e of exList) next[e.id] = e; return next; });
      setPreviousByExercise((prev) => { const next = { ...prev }; for (const [id, sets] of prevPairs) next[id] = sets; return next; });
    } catch {
      // Best-effort: zonder "vorige prestatie" werkt loggen nog steeds, alleen zonder auto-fill/context.
    }
  }, []);

  const enterSession = useCallback(async (next: LocalSessionState) => {
    setSession(next);
    await hydrateExerciseData(next.sessionId, next.userId, next.exercises.map((e) => e.exerciseId));
  }, [hydrateExerciseData]);

  // Terugkomst van de oefeningenbibliotheek (Deel A2) met een gekozen oefening.
  useEffect(() => {
    if (!params.pickedExerciseId || !session) return;
    const exerciseId = params.pickedExerciseId;
    router.setParams({ pickedExerciseId: undefined, pickedAt: undefined });
    (async () => {
      const next = await addExerciseToSession(session, exerciseId);
      setSession(next);
      await hydrateExerciseData(next.sessionId, next.userId, [exerciseId]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.pickedAt]);

  const handleResumeConfirm = async () => {
    if (!pendingResume) return;
    const next = pendingResume;
    setPendingResume(null);
    await enterSession(next);
  };

  const handleResumeDiscard = async () => {
    if (!pendingResume || !userId) return;
    const toDiscard = pendingResume;
    setPendingResume(null);
    setLoadingStart(true);
    await abandonSession(toDiscard);
    setRoutines(await fetchRoutines(userId));
    setLoadingStart(false);
  };

  const handleStartEmpty = async () => {
    if (!userId) return;
    setStarting(true);
    try {
      await enterSession(await startSession(userId, { name: 'Empty Workout', routineId: null, exercises: [] }));
    } catch (e: any) {
      Alert.alert('Oops', e.message ?? 'Could not start workout.');
    } finally {
      setStarting(false);
    }
  };

  const handleStartFromRoutine = async (routine: Routine) => {
    if (!userId) return;
    setStarting(true);
    try {
      const routineExercises = await fetchRoutineExercises(routine.id);
      const next = await startSession(userId, {
        name: routine.name,
        routineId: routine.id,
        exercises: routineExercises.map((re) => ({
          exerciseId: re.exercise.id, targetSets: re.targetSets, targetReps: re.targetReps, targetRestSeconds: re.targetRestSeconds,
        })),
      });
      await enterSession(next);
    } catch (e: any) {
      Alert.alert('Oops', e.message ?? 'Could not start this routine.');
    } finally {
      setStarting(false);
    }
  };

  const draftKey = (exerciseId: string, rowIndex: number) => `${exerciseId}:${rowIndex}`;
  const getDraft = (key: string, previous: { weightKg: number; reps: number } | null) =>
    drafts[key] ?? { weight: previous ? String(previous.weightKg) : '', reps: previous ? String(previous.reps) : '', setType: 'normal' as SetType };
  const patchDraft = (key: string, previous: { weightKg: number; reps: number } | null, patch: Partial<{ weight: string; reps: string; setType: SetType }>) =>
    setDrafts((prev) => ({ ...prev, [key]: { ...getDraft(key, previous), ...patch } }));

  const handleCheckRow = async (exercise: Exercise, row: SetRowVM) => {
    if (!session) return;
    if (row.logged) {
      setSession(await removeSet(session, row.logged.localId));
      return;
    }
    const key = draftKey(exercise.id, row.index);
    const draft = getDraft(key, row.previous);
    const weightKg = parseFloat(draft.weight.replace(',', '.'));
    const reps = parseInt(draft.reps, 10);
    if (!(weightKg >= 0) || !(reps > 0)) {
      Alert.alert('Oops', 'Enter a valid weight and reps.');
      return;
    }
    const afterLog = await logSet(session, exercise.id, { weightKg, reps, setType: draft.setType });
    const plannedExercise = afterLog.exercises.find((e) => e.exerciseId === exercise.id);
    const withTimer = await startRestTimer(afterLog, exercise.id, plannedExercise?.targetRestSeconds ?? 90, exercise.name);
    setSession(withTimer);
  };

  const handleCycleSetType = (exerciseId: string, row: SetRowVM) => {
    if (row.logged) return; // type alleen vóór het afvinken aan te passen
    const key = draftKey(exerciseId, row.index);
    const draft = getDraft(key, row.previous);
    const nextType = SET_TYPE_ORDER[(SET_TYPE_ORDER.indexOf(draft.setType) + 1) % SET_TYPE_ORDER.length];
    patchDraft(key, row.previous, { setType: nextType });
  };

  const handleAddExtraRow = (exerciseId: string, currentRowCount: number) => {
    setManualRowCount((prev) => ({ ...prev, [exerciseId]: currentRowCount + 1 }));
  };

  const handleRemoveExercise = async (exerciseId: string) => {
    if (!session) return;
    setConfirmRemoveExerciseId(null);
    setSession(await removeExerciseFromSession(session, exerciseId));
  };

  const handleAdjustRest = async (deltaSeconds: number) => {
    if (!session?.restTimer) return;
    const remaining = Math.max(0, Math.round((new Date(session.restTimer.endsAt).getTime() - now) / 1000));
    const exerciseName = exercisesById[session.restTimer.exerciseId]?.name ?? 'exercise';
    setSession(await startRestTimer(session, session.restTimer.exerciseId, Math.max(0, remaining + deltaSeconds), exerciseName));
  };

  const handleSkipRest = async () => {
    if (!session) return;
    setSession(await clearRestTimer(session));
  };

  const handleDiscardSession = async () => {
    if (!session) return;
    setConfirmDiscard(false);
    await abandonSession(session);
    setSession(null);
    if (userId) setRoutines(await fetchRoutines(userId));
  };

  const handleEndSession = async () => {
    if (!session) return;
    setEnding(true);
    try {
      const result = await endSession(session, exercisesById);
      if (!result.ok) {
        Alert.alert('Could not save workout', `${result.error} Your workout is still saved on this device — try again when you're back online.`);
        return;
      }
      if (!dailyProgress.workoutDone) toggleWorkout();
      // Meegeven voor de "Save as Routine"-actie op het samenvattingsscherm (A3) —
      // de sessie zelf is dan al leeggemaakt (setSession(null)), dus deze data
      // moet nu al mee, niet later opnieuw opgevraagd worden.
      const exercisesForRoutine = session.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        name: exercisesById[e.exerciseId]?.name ?? 'Exercise',
        targetSets: e.targetSets,
        targetReps: e.targetReps,
        targetRestSeconds: e.targetRestSeconds,
      }));
      setSession(null);
      router.replace({
        pathname: '/plan/session-summary',
        params: { summary: JSON.stringify(result.summary), exercises: JSON.stringify(exercisesForRoutine) },
      });
    } finally {
      setEnding(false);
    }
  };

  const totalVolumeKg = useMemo(() => {
    if (!session) return 0;
    return session.sets.reduce((sum, s) => sum + (s.setType === 'warmup' ? 0 : s.weightKg * s.reps), 0);
  }, [session]);

  const elapsedSeconds = session ? (now - new Date(session.startedAt).getTime()) / 1000 : 0;
  const restRemaining = session?.restTimer ? Math.max(0, Math.round((new Date(session.restTimer.endsAt).getTime() - now) / 1000)) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 120 }}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Icon name="chevL" size={19} color={c.text} />
        </TouchableOpacity>

        {loadingStart ? (
          <ActivityIndicator color={c.accent} style={{ marginTop: 60 }} />
        ) : pendingResume ? (
          <Card accent pad={18} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="dumbbell" size={20} color={c.accentText} />
              <Text style={{ fontSize: 17, fontWeight: '800', color: c.text }}>Resume session?</Text>
            </View>
            <Text style={{ fontSize: 13, color: c.sub, lineHeight: 18 }}>
              "{pendingResume.name}" is still running ({pendingResume.sets.length} sets logged). Pick up where you left off, or discard it.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="Resume" onPress={handleResumeConfirm} style={{ flex: 1 }} icon="play" />
              <Button label="Discard" onPress={handleResumeDiscard} variant="outline" style={{ flex: 1 }} icon="stop" />
            </View>
          </Card>
        ) : !session ? (
          <>
            <Text style={{ fontSize: 26, fontWeight: '800', color: c.text, letterSpacing: -0.6, marginBottom: 6 }}>Start a Workout</Text>
            <Text style={{ fontSize: 13, color: c.sub, marginBottom: 20, lineHeight: 18 }}>Start empty, or jump into a routine.</Text>

            <Button label={starting ? 'Starting…' : 'Empty Workout'} onPress={handleStartEmpty} loading={starting} icon="plus" style={{ marginBottom: 18 }} />

            {routines.length > 0 ? (
              <>
                <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 12, marginHorizontal: 2 }}>Routines</Text>
                <View style={{ gap: 10 }}>
                  {routines.map((r) => (
                    <Card key={r.id} onPress={() => handleStartFromRoutine(r)} pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.cardHi, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={r.isTemplate ? 'dumbbell' : 'flag'} size={19} color={c.sub} />
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: c.text, flex: 1 }}>{r.name}</Text>
                      <Icon name="chevR" size={18} color={c.dim} />
                    </Card>
                  ))}
                </View>
                <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/plan/routines')} style={{ marginTop: 14, alignSelf: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: c.accentText }}>Manage routines</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </>
        ) : (
          <>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: c.text, letterSpacing: -0.5 }}>{session.name}</Text>
              <Text style={{ fontSize: 13, color: c.sub, marginTop: 3 }}>{session.exercises.length} exercises</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <Card pad={14} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: c.sub, marginBottom: 6 }}>TIME</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: c.text, fontFamily: 'monospace' }}>{fmtClock(elapsedSeconds)}</Text>
              </Card>
              <Card pad={14} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: c.sub, marginBottom: 6 }}>VOLUME</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: c.accentText }}>{Math.round(totalVolumeKg).toLocaleString()} <Text style={{ fontSize: 12, color: c.dim }}>kg</Text></Text>
              </Card>
            </View>

            {session.restTimer ? (
              <Card accent pad={14} style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="flame" size={19} color={c.accentText} fill={c.accentText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: c.sub }}>RESTING · {exercisesById[session.restTimer.exerciseId]?.name ?? ''}</Text>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: c.text, fontFamily: 'monospace', marginTop: 2 }}>{fmtClock(restRemaining)}</Text>
                </View>
                <TouchableOpacity onPress={() => handleAdjustRest(-15)} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c.cardHi, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: c.text, fontWeight: '700', fontSize: 12 }}>-15</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleAdjustRest(15)} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c.cardHi, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: c.text, fontWeight: '700', fontSize: 12 }}>+15</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSkipRest} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c.cardHi, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="chevR" size={16} color={c.text} />
                </TouchableOpacity>
              </Card>
            ) : null}

            {session.exercises.map((plannedExercise) => {
              const exercise = exercisesById[plannedExercise.exerciseId];
              if (!exercise) return null;
              const rowCount = Math.max(plannedExercise.targetSets, session.sets.filter((s) => s.exerciseId === exercise.id).length, manualRowCount[exercise.id] ?? 0);
              const rows = buildRows(session.sets, exercise.id, plannedExercise.targetSets, manualRowCount[exercise.id] ?? 0, previousByExercise[exercise.id] ?? []);
              return (
                <Card key={exercise.id} pad={13} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => router.push({ pathname: '/plan/exercise-history', params: { exerciseId: exercise.id, exerciseName: exercise.name } })} style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>{exercise.name}</Text>
                      <Text style={{ fontSize: 11.5, color: c.sub, marginTop: 1 }}>Target {plannedExercise.targetSets} × {plannedExercise.targetReps} · {plannedExercise.targetRestSeconds}s rest</Text>
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setConfirmRemoveExerciseId(exercise.id)} style={{ padding: 6 }}>
                      <Icon name="minus" size={16} color={c.dim} />
                    </TouchableOpacity>
                  </View>

                  {confirmRemoveExerciseId === exercise.id ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.cardHi, borderRadius: 12, padding: 10, marginBottom: 10 }}>
                      <Text style={{ flex: 1, fontSize: 12.5, color: c.text }}>Remove {exercise.name} from this session?</Text>
                      <TouchableOpacity onPress={() => handleRemoveExercise(exercise.id)}><Text style={{ color: c.bad, fontWeight: '700', fontSize: 12.5 }}>Remove</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => setConfirmRemoveExerciseId(null)}><Text style={{ color: c.sub, fontWeight: '600', fontSize: 12.5 }}>Cancel</Text></TouchableOpacity>
                    </View>
                  ) : null}

                  {rows.map((row) => {
                    const key = draftKey(exercise.id, row.index);
                    const draft = row.logged
                      ? { weight: String(row.logged.weightKg), reps: String(row.logged.reps), setType: row.logged.setType }
                      : getDraft(key, row.previous);
                    return (
                      <View key={row.index} style={{ marginBottom: 8, paddingBottom: 8, borderBottomWidth: row.index < rowCount - 1 ? 1 : 0, borderBottomColor: c.line }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ width: 18, textAlign: 'center', fontSize: 13, fontWeight: '800', color: c.dim }}>{row.setNumber}</Text>
                          <TextInput
                            editable={!row.logged}
                            value={draft.weight}
                            onChangeText={(v) => patchDraft(key, row.previous, { weight: v })}
                            keyboardType="decimal-pad"
                            placeholder="kg"
                            placeholderTextColor={c.dim}
                            style={{ flex: 1, backgroundColor: c.cardHi, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, fontSize: 14, color: c.text, opacity: row.logged ? 0.75 : 1 }}
                          />
                          <Text style={{ color: c.dim, fontSize: 12 }}>×</Text>
                          <TextInput
                            editable={!row.logged}
                            value={draft.reps}
                            onChangeText={(v) => patchDraft(key, row.previous, { reps: v })}
                            keyboardType="number-pad"
                            placeholder="reps"
                            placeholderTextColor={c.dim}
                            style={{ flex: 1, backgroundColor: c.cardHi, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, fontSize: 14, color: c.text, opacity: row.logged ? 0.75 : 1 }}
                          />
                          <Check on={!!row.logged} onToggle={() => handleCheckRow(exercise, row)} size={26} />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5, paddingLeft: 26 }}>
                          <Text style={{ fontSize: 11, color: c.dim }}>
                            {row.previous ? `prev: ${row.previous.weightKg}kg × ${row.previous.reps}` : 'no previous data'}
                          </Text>
                          <TouchableOpacity disabled={!!row.logged} activeOpacity={0.6} onPress={() => handleCycleSetType(exercise.id, row)}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: setTypeColor(c, draft.setType) }}>{SET_TYPE_LABEL[draft.setType]}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}

                  <TouchableOpacity activeOpacity={0.7} onPress={() => handleAddExtraRow(exercise.id, rowCount)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Icon name="plus" size={13} color={c.accentText} />
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: c.accentText }}>Add Set</Text>
                  </TouchableOpacity>
                </Card>
              );
            })}

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/plan/exercise-picker', params: { forSession: '1' } })}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: c.line, borderStyle: 'dashed', borderRadius: 16, paddingVertical: 14, marginBottom: 16 }}
            >
              <Icon name="plus" size={17} color={c.text} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>Add Exercise</Text>
            </TouchableOpacity>

            {session.exercises.length === 0 ? (
              <EmptyState icon="dumbbell" title="No exercises yet" body="Tap 'Add Exercise' above to build this workout as you go." />
            ) : null}

            {confirmDiscard ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.card, borderWidth: 1, borderColor: c.bad, borderRadius: 14, padding: 12, marginBottom: 8 }}>
                <Text style={{ flex: 1, fontSize: 12.5, color: c.text }}>Discard this whole workout? This can't be undone.</Text>
                <TouchableOpacity onPress={handleDiscardSession}><Text style={{ color: c.bad, fontWeight: '700', fontSize: 12.5 }}>Discard</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setConfirmDiscard(false)}><Text style={{ color: c.sub, fontWeight: '600', fontSize: 12.5 }}>Cancel</Text></TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity activeOpacity={0.7} onPress={() => setConfirmDiscard(true)} style={{ alignSelf: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: c.dim }}>Discard workout</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {session ? (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.line }}>
          <Button label={ending ? 'Saving…' : 'End Workout'} onPress={handleEndSession} loading={ending} icon="check" />
        </View>
      ) : null}
    </View>
  );
}
