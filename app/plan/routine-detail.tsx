// app/plan/routine-detail.tsx — Routine-detail (Deel A3)
// Oefeningenlijst van 1 routine (template of eigen), starten of (alleen eigen)
// verwijderen.
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Card, Button } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, useLang } from '@/components/store';
import { fill } from '@/constants/i18n';
import { fetchRoutineExercises, deleteRoutine } from '@/src/services/routines';
import type { RoutineExercise } from '@/src/types/workout';

export default function RoutineDetail() {
  const { c } = useTheme();
  const { t } = useLang();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { routineId, routineName, isTemplate } = useLocalSearchParams<{ routineId: string; routineName: string; isTemplate: string }>();

  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<RoutineExercise[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!routineId) return;
    setLoading(true);
    try {
      setExercises(await fetchRoutineExercises(routineId));
    } catch (e: any) {
      Alert.alert(t('oops'), e.message ?? t('routine_load_failed'));
    } finally {
      setLoading(false);
    }
  }, [routineId, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleStart = () => {
    router.navigate({ pathname: '/plan/workout', params: { startRoutineId: routineId, startRoutineName: routineName } });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteRoutine(routineId);
      router.back();
    } catch (e: any) {
      Alert.alert(t('oops'), e.message ?? t('routine_delete_failed'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 120 }}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Icon name="chevL" size={19} color={c.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 26, fontWeight: '800', color: c.text, letterSpacing: -0.6, marginBottom: 4 }}>{routineName}</Text>
        <Text style={{ fontSize: 13, color: c.sub, marginBottom: 18 }}>{fill(t('n_exercises'), { n: exercises.length })}</Text>

        {loading ? (
          <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
        ) : (
          exercises.map((re, i) => (
            <Card key={re.id} pad={13} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 8 }}>
              <Text style={{ width: 20, textAlign: 'center', fontSize: 14, fontWeight: '800', color: c.dim }}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.text }}>{re.exercise.name}</Text>
                <Text style={{ fontSize: 12, color: c.sub, marginTop: 2 }}>{fill(t('routine_line'), { sets: re.targetSets, reps: re.targetReps, rest: re.targetRestSeconds })}</Text>
              </View>
            </Card>
          ))
        )}

        {isTemplate === '0' ? (
          confirmDelete ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.card, borderWidth: 1, borderColor: c.bad, borderRadius: 14, padding: 12, marginTop: 12 }}>
              <Text style={{ flex: 1, fontSize: 12.5, color: c.text }}>{t('delete_routine_q')}</Text>
              <TouchableOpacity onPress={handleDelete} disabled={deleting}><Text style={{ color: c.bad, fontWeight: '700', fontSize: 12.5 }}>{deleting ? t('deleting') : t('delete')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setConfirmDelete(false)}><Text style={{ color: c.sub, fontWeight: '600', fontSize: 12.5 }}>{t('cancel')}</Text></TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity activeOpacity={0.7} onPress={() => setConfirmDelete(true)} style={{ alignSelf: 'center', marginTop: 14 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: c.bad }}>{t('delete_routine')}</Text>
            </TouchableOpacity>
          )
        ) : null}
      </ScrollView>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.line }}>
        <Button label={t('qa_workout')} onPress={handleStart} icon="dumbbell" />
      </View>
    </View>
  );
}
