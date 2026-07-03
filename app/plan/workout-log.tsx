// app/plan/workout-log.tsx — sets/reps/gewicht loggen voor 1 oefening binnen een sessie
// Formulier om een nieuwe set toe te voegen + een lijst van al gelogde sets.
// Link naar "History" opent de progressive-overload view voor deze oefening.
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Card, Input, Button } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/components/store';
import { fetchSessionExerciseSets, logSet } from '@/src/services/workouts';
import type { LoggedSet } from '@/src/types/workout';

export default function WorkoutLog() {
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sessionId, exerciseId, exerciseName, targetSets, targetReps } = useLocalSearchParams<{
    sessionId: string; exerciseId: string; exerciseName: string; targetSets: string; targetReps: string;
  }>();

  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!sessionId || !exerciseId) return;
    setLoading(true);
    try {
      const data = await fetchSessionExerciseSets(sessionId, exerciseId);
      setSets(data);
    } catch (e: any) {
      Alert.alert('Oops', e.message ?? 'Could not load sets.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, exerciseId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async () => {
    const repsNum = parseInt(reps, 10);
    const weightNum = parseFloat(weight);
    if (!repsNum || repsNum <= 0 || Number.isNaN(weightNum) || weightNum < 0) {
      Alert.alert('Oops', 'Enter valid reps and weight.');
      return;
    }
    setSaving(true);
    try {
      await logSet(sessionId, exerciseId, sets.length + 1, repsNum, weightNum);
      setReps('');
      setWeight('');
      await load();
    } catch (e: any) {
      Alert.alert('Oops', e.message ?? 'Could not save set.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Icon name="chevL" size={19} color={c.text} />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: c.text, letterSpacing: -0.5 }}>{exerciseName}</Text>
            <Text style={{ fontSize: 13, color: c.sub, marginTop: 4 }}>Target: {targetSets} sets · {targetReps} reps</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/plan/exercise-history', params: { exerciseId, exerciseName } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 100, paddingVertical: 7, paddingHorizontal: 12, marginTop: 2 }}
          >
            <Icon name="chart" size={14} color={c.text} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: c.text }}>History</Text>
          </TouchableOpacity>
        </View>

        <Card pad={14} style={{ marginBottom: 18, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Input label="Reps" value={reps} onChangeText={setReps} keyboardType="number-pad" placeholder="10" style={{ flex: 1 }} />
            <Input label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="60" style={{ flex: 1 }} />
          </View>
          <Button label={saving ? 'Adding…' : `Add Set ${sets.length + 1}`} onPress={handleAdd} loading={saving} icon="plus" />
        </Card>

        <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 12, marginHorizontal: 2 }}>Logged Sets</Text>

        {sets.length === 0 && !loading ? (
          <Text style={{ fontSize: 13, color: c.sub, marginHorizontal: 2 }}>No sets logged yet.</Text>
        ) : null}

        {sets.map((s) => (
          <Card key={s.id} pad={13} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 8 }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.cardHi, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: c.text }}>{s.setNumber}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 14.5, color: c.text, fontWeight: '600' }}>{s.reps} reps</Text>
            <Text style={{ fontSize: 14.5, color: c.accentText, fontWeight: '700' }}>{s.weightKg} kg</Text>
          </Card>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
