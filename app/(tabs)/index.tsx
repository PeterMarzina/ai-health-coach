// app/(tabs)/index.tsx — Home / dashboard
// Dit is het startscherm (route "/"). Het toont de begroeting, je dagscore,
// de focus van vandaag, een paar statistiek-tegels, de AI-coach en je voortgang.

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// ── Eigen bouwstenen en data ophalen ──────────────────────────────
import { Screen } from '@/components/Screen';        // scrollbaar omhulsel met veilige randen
import { Card, Section, Check, Bar } from '@/components/ui'; // kaartje + sectiekop + vinkje + balk
import { Icon } from '@/components/Icon';             // iconen (bell, target, chevR, ...)
import { Ring, Sparkline } from '@/components/Charts';// ronde grafiek + mini-lijngrafiek
import { useTheme, useLang, useSettings, useDaily } from '@/components/store'; // thema, taal, AI-profiel, dagelijkse loop
import { DATA } from '@/constants/data';             // voorbeeld-data (mock)
import { generateAdvice } from '@/src/services/adviceGenerator';
import type { FocusTask } from '@/src/services/todayFocus';

// Eén taak uit de "Today's Focus"-lijst. `onToggle` (workout) of `onIncrement`
// (stappen/water) bepaalt welke actie rechts verschijnt; zonder één van beide
// is de kaart puur informatief (bv. de hersteltip).
function FocusTaskCard({
  task, onPress, onToggle, onIncrement,
}: { task: FocusTask; onPress?: () => void; onToggle?: () => void; onIncrement?: () => void }) {
  const { c } = useTheme();
  return (
    <Card onPress={onPress} pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 10, opacity: task.done ? 0.68 : 1 }}>
      <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={task.icon} size={22} color={c.accentText} fill={['droplet', 'moon', 'leaf'].includes(task.icon) ? c.accentText : undefined} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.text }}>{task.title}</Text>
        <Text style={{ fontSize: 12, color: c.sub, marginTop: 2 }}>{task.subtitle}</Text>
      </View>
      {task.xp > 0 ? (
        <Text style={{ fontSize: 11, fontWeight: '700', color: c.accentText, marginRight: 2 }}>+{task.xp} XP</Text>
      ) : null}
      {onToggle ? (
        <Check on={task.done} onToggle={onToggle} size={24} />
      ) : onIncrement ? (
        <TouchableOpacity activeOpacity={0.7} onPress={onIncrement} disabled={task.done} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.cardHi, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', opacity: task.done ? 0.4 : 1 }}>
          <Icon name="plus" size={16} color={c.text} />
        </TouchableOpacity>
      ) : null}
    </Card>
  );
}

export default function Home() {
  const { c } = useTheme();        // c = het kleurenpalet (donker of licht)
  const { lang } = useLang();
  const { profileContext } = useSettings();
  const {
    streakDays, level, xpProgress, score, focusTasks, toggleWorkout, addSteps, addWater,
  } = useDaily();                  // dagscore, focus-lijst, streak & XP (Sprint 3)
  const router = useRouter();      // hiermee navigeer je naar andere schermen

  // Zodra het AI-profiel bekend is (na onboarding), tonen we het rule-based
  // advies hier in plaats van de statische placeholder-tekst.
  const advice = profileContext ? generateAdvice(profileContext, lang) : null;

  // Hulpfunctie: pakt een kleur op naam uit het thema, anders de accentkleur
  const hue = (k: string) => (c as any)[k] || c.accent;

  return (
    <Screen>
      {/* ── Koptekst: logo, begroeting en belletje ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          {/* Vierkant "A"-logo */}
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontWeight: '800', fontSize: 18, color: c.accentText, fontStyle: 'italic' }}>A</Text>
          </View>
          {/* Begroetingstekst */}
          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: c.text }}>Good morning, Jay 👋</Text>
            <Text style={{ fontSize: 12.5, color: c.sub, marginTop: 1 }}>Let's crush today.</Text>
          </View>
        </View>
        {/* Belletje-knop met rood stipje (notificatie) */}
        <TouchableOpacity activeOpacity={0.7} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bell" size={20} color={c.text} />
          <View style={{ position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: c.accent, borderWidth: 1.5, borderColor: c.card }} />
        </TouchableOpacity>
      </View>

      {/* ── Dagscore-kaart met ronde grafiek (Ring) ── */}
      <Card accent pad={18} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 21, fontWeight: '800', color: c.text, letterSpacing: -0.4, lineHeight: 25 }}>Your Daily{'\n'}Score</Text>
          <Text style={{ fontSize: 12.5, color: c.sub, marginTop: 8, lineHeight: 18, maxWidth: 150 }}>Habits, training, nutrition & recovery combined into one.</Text>
          {/* Knop "See breakdown" (nog zonder actie) */}
          <TouchableOpacity activeOpacity={0.7} style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: c.cardHi, borderWidth: 1, borderColor: c.line, borderRadius: 100, paddingVertical: 7, paddingHorizontal: 13 }}>
            <Text style={{ color: c.text, fontSize: 12.5, fontWeight: '600' }}>See breakdown</Text>
            <Icon name="chevR" size={14} color={c.text} />
          </TouchableOpacity>
        </View>
        {/* De ronde score-grafiek; het getal staat in het midden */}
        <Ring size={132} stroke={13} value={score.score} glow>
          <Text style={{ fontSize: 44, fontWeight: '800', color: c.text, letterSpacing: -1 }}>{score.score}</Text>
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: c.accentText, marginTop: 2 }}>
            {score.score >= 80 ? 'Great work' : score.score >= 40 ? 'Keep going' : 'Let\'s start'}
          </Text>
        </Ring>
      </Card>

      {/* ── Streak + XP: de dopamine-feedback van de dagelijkse loop ── */}
      <View style={{ flexDirection: 'row', gap: 11, marginBottom: 18 }}>
        <Card pad={13} style={{ flex: 1, borderRadius: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="flame" size={16} color={c.calories} fill={c.calories} />
            <Text style={{ fontSize: 12.5, color: c.sub, fontWeight: '600' }}>Streak</Text>
          </View>
          <Text style={{ fontSize: 21, fontWeight: '800', color: c.text, marginTop: 6, letterSpacing: -0.5 }}>
            {streakDays} <Text style={{ fontSize: 12, color: c.dim, fontWeight: '600' }}>{streakDays === 1 ? 'day' : 'days'}</Text>
          </Text>
        </Card>
        <Card pad={13} style={{ flex: 1, borderRadius: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="trophy" size={16} color={c.accentText} />
            <Text style={{ fontSize: 12.5, color: c.sub, fontWeight: '600' }}>Level {level}</Text>
          </View>
          <Text style={{ fontSize: 11, color: c.dim, marginTop: 7, marginBottom: 6 }}>{xpProgress.current} / {xpProgress.goal} XP</Text>
          <Bar value={xpProgress.current} max={xpProgress.goal} color={c.accent} height={6} />
        </Card>
      </View>

      {/* ── Focus van vandaag: afgeleid van het AI-profiel + voortgang vandaag ── */}
      <Section title="Today's Focus" action="See all" onAction={() => router.push('/plan')} />
      {focusTasks.map((task) => {
        if (task.id === 'workout') {
          return <FocusTaskCard key={task.id} task={task} onPress={() => router.push('/plan/workout')} onToggle={toggleWorkout} />;
        }
        if (task.id === 'steps') {
          return <FocusTaskCard key={task.id} task={task} onIncrement={() => addSteps(1000)} />;
        }
        if (task.id === 'water') {
          return <FocusTaskCard key={task.id} task={task} onIncrement={() => addWater(0.25)} />;
        }
        if (task.id === 'recovery') {
          return <FocusTaskCard key={task.id} task={task} onPress={() => router.push('/recovery')} />;
        }
        return <FocusTaskCard key={task.id} task={task} />;
      })}

      {/* ── Statistiek-tegels: één kaartje per item uit DATA.stats ── */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 11, marginTop: 8, marginBottom: 18 }}>
        {/* .map() = herhaal dit kaartje voor elke statistiek in de data */}
        {DATA.stats.map((s) => (
          <Card key={s.key} pad={13} style={{ width: '47.8%', borderRadius: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12.5, color: c.sub, fontWeight: '600' }}>{s.label}</Text>
              <Icon name={s.icon as any} size={16} color={hue(s.hue)} fill={s.icon === 'flame' ? hue(s.hue) : undefined} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 6 }}>
              <Text style={{ fontSize: 21, fontWeight: '800', color: c.text, letterSpacing: -0.5 }}>{s.value}</Text>
              <Text style={{ fontSize: 11, color: c.dim, fontWeight: '600' }}>{s.goal}</Text>
            </View>
            {/* Mini-grafiekje van de week */}
            <View style={{ marginTop: 8 }}>
              <Sparkline data={s.spark} color={hue(s.hue)} w={130} h={28} />
            </View>
          </Card>
        ))}
      </View>

      {/* ── AI-coach kaart; knop "Talk to Coach" → naar voeding-scherm ── */}
      <Section title="AI Coach" />
      <Card pad={16} style={{ marginBottom: 18, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Icon name="sparkle" size={15} color={c.accentText} fill={c.accentText} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: c.accentText }}>AI Coach</Text>
            </View>
            <Text style={{ fontSize: 15.5, fontWeight: '700', color: c.text }}>{advice ? advice.title : "Here's your plan for today."}</Text>
            <Text style={{ fontSize: 12.5, color: c.sub, marginTop: 6, lineHeight: 18 }}>{advice ? advice.body : "Lower body focus — intensity & progressive overload. Don't forget your protein goal!"}</Text>
            <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/coach')} style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', backgroundColor: c.accent, borderRadius: 100, paddingVertical: 9, paddingHorizontal: 15 }}>
              <Icon name="chat" size={15} color={c.onAccent} />
              <Text style={{ color: c.onAccent, fontSize: 13, fontWeight: '700' }}>Talk to Coach</Text>
            </TouchableOpacity>
          </View>
          {/* Plek voor een 3D-coach plaatje */}
          <View style={{ width: 96, alignSelf: 'stretch', borderRadius: 14, backgroundColor: c.cardLo, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
            <Icon name="user" size={40} color={c.accentText} />
            <Text style={{ fontSize: 8, color: c.dim, marginTop: 6, fontFamily: 'monospace' }}>3D COACH</Text>
          </View>
        </View>
      </Card>

      {/* ── Voortgang: gewicht-kaart, klikbaar → naar progress-scherm ── */}
      <Section title="Progress" action="See all" onAction={() => router.push('/progress')} />
      <Card onPress={() => router.push('/progress')} pad={15} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chart" size={19} color={c.accentText} />
        </View>
        <View>
          <Text style={{ fontSize: 12, color: c.sub, fontWeight: '600' }}>Weight</Text>
          <Text style={{ fontSize: 19, fontWeight: '800', color: c.text, letterSpacing: -0.5 }}>78.4 <Text style={{ fontSize: 12, fontWeight: '600', color: c.sub }}>kg</Text></Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Sparkline data={DATA.weight.sparkWeek} color={c.accent} w={96} h={34} />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.accentText }}>−0.6 kg</Text>
          <Text style={{ fontSize: 11, color: c.dim }}>vs last week</Text>
        </View>
      </Card>
    </Screen>
  );
}