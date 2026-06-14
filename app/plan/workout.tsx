// app/plan/workout.tsx — Workout-detailscherm met live timer
// Lijst met oefeningen die je kunt afvinken (exDone). Een timer die elke seconde
// optelt zolang timerOn aanstaat (via setInterval in useEffect). fmt() maakt er
// een mm:ss-tijd van. De startknop zet de timer aan/uit.
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card, Check } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Placeholder } from '@/components/ui';
import { useTheme } from '@/components/store';
import { DATA } from '@/constants/data';

export default function WorkoutDetail() {
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [exDone, setExDone] = useState(DATA.workout.exercises.map((e) => e.done));
  const [timerOn, setTimerOn] = useState(false);
  const [secs, setSecs] = useState(0);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (timerOn) {
      intervalRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerOn]);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${h ? h + ':' : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const doneCount = exDone.filter(Boolean).length;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}>
        {/* header */}
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Icon name="chevL" size={19} color={c.text} />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: c.text, letterSpacing: -0.6, lineHeight: 32 }}>Lower Body{'\n'}Strength</Text>
            <Text style={{ fontSize: 13, color: c.accentText, fontWeight: '600', marginTop: 8 }}>~45 min</Text>
            <Text style={{ fontSize: 13, color: c.sub, marginTop: 3, lineHeight: 18 }}>Build strength and power in your lower body.</Text>
          </View>
          <Placeholder label="SQUAT" style={{ width: 110, height: 120, borderRadius: 16 }} />
        </View>

        {/* timer */}
        <Card pad={16} style={{ marginBottom: 18, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: c.sub, marginBottom: 12 }}>ELAPSED TIME</Text>
          <Text style={{ fontSize: 48, fontWeight: '800', color: c.accentText, fontFamily: 'monospace', letterSpacing: -1 }}>{fmt(secs)}</Text>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setTimerOn(!timerOn)} style={{ marginTop: 16, width: '100%', paddingVertical: 12, borderRadius: 12, backgroundColor: c.accent, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: c.onAccent }}>{timerOn ? 'Pause' : 'Start'}</Text>
          </TouchableOpacity>
        </Card>

        {/* exercises */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 2, marginBottom: 12 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Exercises</Text>
          <Text style={{ fontSize: 12.5, color: c.sub, fontWeight: '600' }}>{doneCount}/{DATA.workout.exercises.length} done</Text>
        </View>

        {DATA.workout.exercises.map((e, i) => (
          <Card key={e.n} pad={11} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 10, opacity: exDone[i] ? 0.7 : 1 }}>
            <Text style={{ width: 22, textAlign: 'center', fontSize: 17, fontWeight: '800', color: exDone[i] ? c.accentText : c.dim }}>{i + 1}</Text>
            <Placeholder label="EX" style={{ width: 50, height: 50 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.text, textDecorationLine: exDone[i] ? 'line-through' : 'none', textDecorationColor: c.dim }}>{e.n}</Text>
              <Text style={{ fontSize: 12, color: c.sub, marginTop: 2 }}>{e.sets}</Text>
            </View>
            <Check on={exDone[i]} onToggle={() => setExDone((a) => a.map((v, j) => (j === i ? !v : v)))} />
          </Card>
        ))}
      </ScrollView>

      {/* sticky CTA */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.line }}>
        <TouchableOpacity activeOpacity={0.8} style={{ width: '100%', height: 52, borderRadius: 16, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
          <Icon name="dumbbell" size={20} color={c.onAccent} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: c.onAccent }}>Start Workout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
