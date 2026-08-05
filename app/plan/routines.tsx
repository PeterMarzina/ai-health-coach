// app/plan/routines.tsx — Routines-overzicht (Deel A3)
// Ingebouwde templates + eigen opgeslagen routines. Tik een routine open voor
// de oefeningenlijst en om 'm te starten of (eigen routines) te verwijderen.
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Card, EmptyState } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, useAuth } from '@/components/store';
import { fetchRoutines } from '@/src/services/routines';
import type { Routine } from '@/src/types/workout';

export default function Routines() {
  const { c } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = session?.user.id ?? null;

  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState<Routine[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      setRoutines(await fetchRoutines(userId));
    } catch (e: any) {
      Alert.alert('Oops', e.message ?? 'Could not load routines.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const templates = routines.filter((r) => r.isTemplate);
  const own = routines.filter((r) => !r.isTemplate);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Icon name="chevL" size={19} color={c.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 26, fontWeight: '800', color: c.text, letterSpacing: -0.6, marginBottom: 18 }}>Routines</Text>

        {loading ? (
          <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
        ) : routines.length === 0 ? (
          <EmptyState icon="flag" title="No routines yet" body="Finish a workout and save it as a routine to see it here." />
        ) : (
          <>
            {own.length > 0 ? (
              <>
                <Text style={{ fontSize: 12, fontWeight: '700', color: c.sub, marginBottom: 10, marginHorizontal: 2, letterSpacing: 0.4 }}>MY ROUTINES</Text>
                <View style={{ gap: 10, marginBottom: 20 }}>
                  {own.map((r) => (
                    <Card key={r.id} onPress={() => router.push({ pathname: '/plan/routine-detail', params: { routineId: r.id, routineName: r.name, isTemplate: '0' } })} pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="flag" size={19} color={c.accentText} />
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: c.text, flex: 1 }}>{r.name}</Text>
                      <Icon name="chevR" size={18} color={c.dim} />
                    </Card>
                  ))}
                </View>
              </>
            ) : null}

            <Text style={{ fontSize: 12, fontWeight: '700', color: c.sub, marginBottom: 10, marginHorizontal: 2, letterSpacing: 0.4 }}>TEMPLATES</Text>
            <View style={{ gap: 10 }}>
              {templates.map((r) => (
                <Card key={r.id} onPress={() => router.push({ pathname: '/plan/routine-detail', params: { routineId: r.id, routineName: r.name, isTemplate: '1' } })} pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.cardHi, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="dumbbell" size={19} color={c.sub} />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: c.text, flex: 1 }}>{r.name}</Text>
                  <Icon name="chevR" size={18} color={c.dim} />
                </Card>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
