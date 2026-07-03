// app/plan/exercise-history.tsx — progressive overload: gewicht/reps per oefening over tijd
// Grafiek van het zwaarste gewicht per workout (top set) + een tabel met alle
// individueel gelogde sets, nieuwste eerst.
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Card } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { LineChart } from '@/components/Charts';
import { useTheme, useAuth } from '@/components/store';
import { fetchExerciseHistory } from '@/src/services/workouts';
import type { LoggedSet } from '@/src/types/workout';

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ExerciseHistory() {
  const { c } = useTheme();
  const { session: authSession } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { exerciseId, exerciseName } = useLocalSearchParams<{ exerciseId: string; exerciseName: string }>();
  const userId = authSession?.user.id ?? null;

  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId || !exerciseId) return;
    setLoading(true);
    try {
      const data = await fetchExerciseHistory(userId, exerciseId);
      setSets(data);
    } catch (e: any) {
      Alert.alert('Oops', e.message ?? 'Could not load history.');
    } finally {
      setLoading(false);
    }
  }, [userId, exerciseId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Eén punt per workout-sessie: het zwaarste gewicht dat die dag voor deze
  // oefening is gelogd (de "top set"), oplopend op tijd voor de grafiek.
  const sessionPoints = useMemo(() => {
    const bySession = new Map<string, LoggedSet[]>();
    for (const s of sets) {
      const arr = bySession.get(s.sessionId) ?? [];
      arr.push(s);
      bySession.set(s.sessionId, arr);
    }
    return Array.from(bySession.values())
      .map((group) => ({ date: group[0].completedAt, maxWeight: Math.max(...group.map((g) => g.weightKg)) }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sets]);

  const recentFirst = useMemo(
    () => [...sets].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()),
    [sets]
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Icon name="chevL" size={19} color={c.text} />
        </TouchableOpacity>

        <Text style={{ fontSize: 26, fontWeight: '800', color: c.text, letterSpacing: -0.6, marginBottom: 4 }}>{exerciseName}</Text>
        <Text style={{ fontSize: 13, color: c.sub, marginBottom: 18 }}>Progressive overload — top set weight per workout.</Text>

        {loading ? (
          <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
        ) : (
          <>
            <Card pad={16} style={{ marginBottom: 18 }}>
              {sessionPoints.length >= 2 ? (
                <LineChart
                  data={sessionPoints.map((p) => p.maxWeight)}
                  labels={sessionPoints.map((p) => shortDate(p.date))}
                  color={c.accent}
                  w={320}
                  h={158}
                  last
                />
              ) : (
                <Text style={{ fontSize: 13, color: c.sub, textAlign: 'center', paddingVertical: 20 }}>
                  Log this exercise in at least 2 workouts to see your progress trend.
                </Text>
              )}
            </Card>

            <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 12, marginHorizontal: 2 }}>History</Text>
            {recentFirst.length === 0 ? (
              <Text style={{ fontSize: 13, color: c.sub, marginHorizontal: 2 }}>No sets logged for this exercise yet.</Text>
            ) : null}
            {recentFirst.map((s) => (
              <Card key={s.id} pad={13} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '600', color: c.text }}>{shortDate(s.completedAt)}</Text>
                  <Text style={{ fontSize: 12, color: c.sub, marginTop: 2 }}>Set {s.setNumber}</Text>
                </View>
                <Text style={{ fontSize: 13.5, color: c.sub }}>{s.reps} reps</Text>
                <Text style={{ fontSize: 14.5, color: c.accentText, fontWeight: '700', width: 64, textAlign: 'right' }}>{s.weightKg} kg</Text>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
