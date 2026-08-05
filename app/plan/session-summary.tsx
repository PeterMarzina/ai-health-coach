// app/plan/session-summary.tsx — Sessiesamenvatting + PR-viering (Deel A4)
// Duur, totaal volume, aantal sets en behaalde PR's na het afronden van een
// workout. PR's worden duidelijk maar bewust niet-schreeuwerig gevierd (geen
// modal/confetti — een rustige kaart per PR). "Save as Routine" (A3) gebruikt
// de meegegeven oefeningenlijst van de net afgeronde sessie.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Card, Input, Button } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, useAuth } from '@/components/store';
import { saveSessionAsRoutine } from '@/src/services/routines';
import type { SessionSummary, PersonalRecordType } from '@/src/types/workout';

type RoutineExerciseDraft = { exerciseId: string; name: string; targetSets: number; targetReps: string; targetRestSeconds: number };

function fmtDuration(totalSeconds: number): string {
  const m = Math.round(totalSeconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function prLabel(recordType: PersonalRecordType, weightKg: number, reps: number, estimatedOneRm: number): string {
  if (recordType === 'max_weight') return `New heaviest weight: ${weightKg}kg × ${reps}`;
  if (recordType === 'max_1rm') return `New estimated 1RM: ${Math.round(estimatedOneRm)}kg`;
  return `New best at ${weightKg}kg: ${reps} reps`;
}

export default function SessionSummaryScreen() {
  const { c } = useTheme();
  const { session: authSession } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { summary: summaryParam, exercises: exercisesParam } = useLocalSearchParams<{ summary?: string; exercises?: string }>();
  const userId = authSession?.user.id ?? null;

  const summary: SessionSummary | null = useMemo(() => {
    try { return summaryParam ? (JSON.parse(summaryParam) as SessionSummary) : null; } catch { return null; }
  }, [summaryParam]);
  const routineExercises: RoutineExerciseDraft[] = useMemo(() => {
    try { return exercisesParam ? (JSON.parse(exercisesParam) as RoutineExerciseDraft[]) : []; } catch { return []; }
  }, [exercisesParam]);

  const [showSaveRoutine, setShowSaveRoutine] = useState(false);
  const [routineName, setRoutineName] = useState(summary?.session.name ?? 'My Routine');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveRoutine = async () => {
    if (!userId || !routineName.trim()) return;
    setSaving(true);
    try {
      await saveSessionAsRoutine(userId, routineName.trim(), routineExercises.map((e) => ({
        exerciseId: e.exerciseId, targetSets: e.targetSets, targetReps: e.targetReps, targetRestSeconds: e.targetRestSeconds,
      })));
      setSaved(true);
      setShowSaveRoutine(false);
    } catch (e: any) {
      Alert.alert('Oops', e.message ?? 'Could not save this routine.');
    } finally {
      setSaving(false);
    }
  };

  const handleDone = () => router.replace('/(tabs)/plan');

  if (!summary) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 15, color: c.sub, textAlign: 'center', marginBottom: 16 }}>Workout saved.</Text>
        <Button label="Done" onPress={handleDone} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 16, paddingBottom: insets.bottom + 120 }}>
        <View style={{ alignItems: 'center', marginBottom: 22 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Icon name="check" size={26} color={c.accentText} strokeWidth={3} />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '800', color: c.text, letterSpacing: -0.5 }}>Workout Complete</Text>
          <Text style={{ fontSize: 13, color: c.sub, marginTop: 4 }}>{summary.session.name}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <Card pad={14} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: c.sub, fontWeight: '600', marginBottom: 6 }}>DURATION</Text>
            <Text style={{ fontSize: 17, fontWeight: '800', color: c.text }}>{fmtDuration(summary.durationSeconds)}</Text>
          </Card>
          <Card pad={14} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: c.sub, fontWeight: '600', marginBottom: 6 }}>VOLUME</Text>
            <Text style={{ fontSize: 17, fontWeight: '800', color: c.text }}>{Math.round(summary.totalVolumeKg).toLocaleString()} kg</Text>
          </Card>
          <Card pad={14} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: c.sub, fontWeight: '600', marginBottom: 6 }}>SETS</Text>
            <Text style={{ fontSize: 17, fontWeight: '800', color: c.text }}>{summary.totalSets}</Text>
          </Card>
        </View>

        {summary.personalRecords.length > 0 ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12, marginHorizontal: 2 }}>
              <Icon name="trophy" size={16} color={c.accentText} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>Personal Records</Text>
            </View>
            <View style={{ gap: 8, marginBottom: 18 }}>
              {summary.personalRecords.map((pr, i) => (
                <Card key={`${pr.exerciseId}-${pr.recordType}-${i}`} pad={13} accent style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="trophy" size={16} color={c.accentText} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: c.text }}>{pr.exerciseName}</Text>
                    <Text style={{ fontSize: 12, color: c.sub, marginTop: 1 }}>{prLabel(pr.recordType, pr.weightKg, pr.reps, pr.estimatedOneRm)}</Text>
                  </View>
                </Card>
              ))}
            </View>
          </>
        ) : null}

        {routineExercises.length > 0 ? (
          saved ? (
            <Card pad={14} style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="check" size={16} color={c.accentText} />
              <Text style={{ fontSize: 13, color: c.text, fontWeight: '600' }}>Saved as a routine</Text>
            </Card>
          ) : showSaveRoutine ? (
            <Card pad={14} style={{ marginBottom: 8, gap: 10 }}>
              <Input label="Routine name" value={routineName} onChangeText={setRoutineName} placeholder="My Routine" />
              <Button label={saving ? 'Saving…' : 'Save Routine'} onPress={handleSaveRoutine} loading={saving} icon="flag" />
            </Card>
          ) : (
            <TouchableOpacity activeOpacity={0.7} onPress={() => setShowSaveRoutine(true)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingVertical: 13, marginBottom: 8 }}>
              <Icon name="flag" size={16} color={c.text} />
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: c.text }}>Save as Routine</Text>
            </TouchableOpacity>
          )
        ) : null}
      </ScrollView>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.line }}>
        <Button label="Done" onPress={handleDone} />
      </View>
    </View>
  );
}
