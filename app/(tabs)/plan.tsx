// app/(tabs)/plan.tsx — Plan (sub-tabs, week strip, workout, nutrition, habits)
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card, Section, Bar, Check } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/components/store';
import { useSettings } from '@/components/store';
import { DATA, CONSUMED } from '@/constants/data';

const TABS = ['Overview', 'Workouts', 'Nutrition', 'Habits'];

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
  const { goals } = useSettings();
  const [tab, setTab] = useState('Overview');
  const [habits, setHabits] = useState(DATA.habits.map((h) => h.done));
  const toggle = (i: number) => setHabits((a) => a.map((v, j) => (j === i ? !v : v)));

  const showWorkout = tab === 'Overview' || tab === 'Workouts';
  const showNutri = tab === 'Overview' || tab === 'Nutrition';
  const showHabits = tab === 'Overview' || tab === 'Habits';

  const nutri = [
    { label: 'Calories', text: `${CONSUMED.calories.toLocaleString()} / ${goals.calories.toLocaleString()} kcal`, v: CONSUMED.calories, max: goals.calories, color: c.calories, icon: 'flame' as const },
    { label: 'Protein', text: `${CONSUMED.protein} / ${goals.protein} g`, v: CONSUMED.protein, max: goals.protein, color: c.protein, icon: 'target' as const },
    { label: 'Water', text: `${CONSUMED.water} / ${goals.water} L`, v: CONSUMED.water, max: goals.water, color: c.water, icon: 'droplet' as const },
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
            <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.text, marginTop: 2 }}>May 20 – May 26</Text>
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
          {DATA.weekDays.map((d) => (
            <View key={d.n} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
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
          <Card onPress={() => router.push('/plan/workout')} pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 18 }}>
            <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="target" size={24} color={c.accentText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15.5, fontWeight: '700', color: c.text }}>Lower Body Strength</Text>
              <Text style={{ fontSize: 12.5, color: c.sub, marginTop: 2 }}>~45 min · 6 exercises</Text>
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
            {DATA.habits.map((h, i) => (
              <View key={h.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: i < DATA.habits.length - 1 ? 1 : 0, borderBottomColor: c.line }}>
                <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: c.cardHi, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={h.icon as any} size={18} color={habits[i] ? c.accentText : c.sub} fill={h.icon === 'sparkle' && habits[i] ? c.accentText : undefined} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '600', color: c.text }}>{h.name}</Text>
                  <Text style={{ fontSize: 12, color: c.sub, marginTop: 1 }}>{h.detail}</Text>
                </View>
                <Check on={habits[i]} onToggle={() => toggle(i)} />
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
