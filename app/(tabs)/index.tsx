// app/(tabs)/index.tsx — Home / dashboard
// Dit is het startscherm (route "/"). Het toont de begroeting, je dagscore,
// de focus van vandaag, een paar statistiek-tegels, de AI-coach en je voortgang.

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import { useRouter, useFocusEffect } from 'expo-router';

// ── Eigen bouwstenen en data ophalen ──────────────────────────────
import { Screen } from '@/components/Screen';        // scrollbaar omhulsel met veilige randen
import { Card, Section, Check, Bar } from '@/components/ui'; // kaartje + sectiekop + vinkje + balk
import { Icon } from '@/components/Icon';             // iconen (bell, target, chevR, ...)
import { Ring, Sparkline } from '@/components/charts';// ronde grafiek + mini-lijngrafiek
import { useTheme, useLang, useSettings, useDaily, useAuth } from '@/components/store'; // thema, taal, AI-profiel, dagelijkse loop
import { generateAdvice } from '@/src/services/adviceGenerator';
import { SCORE_WEIGHTS } from '@/src/services/dailyScore';
import { getDailyAIAdvice } from '@/src/services/aiAdvice';
import { fetchHomeStats, HomeStats } from '@/src/services/homeDashboard';
import { weeklyWeightChange } from '@/src/services/weightTrend';
import type { FocusTask } from '@/src/services/todayFocus';

import type { TKey } from '@/constants/i18n';

function greetingKey(hour: number): TKey {
  if (hour < 12) return 'greet_morning';
  if (hour < 18) return 'greet_afternoon';
  return 'greet_evening';
}

// 7.4 → "7h 24m" (nl: "7u 24m"), 8 → "8h"
function formatSleep(hours: number, t: (k: TKey) => string): string {
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `${h}${t('hour_short')} ${m}${t('min_short')}` : `${h}${t('hour_short')}`;
}

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
  const { lang, t, locale } = useLang();
  const fmt = (n: number) => n.toLocaleString(locale);
  const { profileContext, fullName, goals, measurements } = useSettings();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const {
    progress, streakDays, level, xpProgress, score, focusTasks, toggleWorkout, addSteps, addWater,
  } = useDaily();                  // dagscore, focus-lijst, streak & XP (Sprint 3)
  const router = useRouter();      // hiermee navigeer je naar andere schermen

  const name = fullName || profileContext?.answers.name || null;

  // ── Stat-tegels + gewicht: bij elke focus opnieuw, want maaltijden, slaap en
  // gewicht worden op andere schermen gelogd.
  const [stats, setStats] = useState<HomeStats | null>(null);
  const loadStats = useCallback(async () => {
    if (!userId) return;
    try {
      setStats(await fetchHomeStats(userId));
    } catch (e) {
      console.warn('Home stats laden mislukt', e); // tegels tonen dan "—"
    }
  }, [userId]);
  useFocusEffect(useCallback(() => { loadStats(); }, [loadStats]));

  // ── AI-coach: rule-based advies meteen tonen, vervangen door het NVIDIA-advies
  // zodra dat binnen is. Faalt de call (limiet, geen netwerk), dan blijft rule-based staan.
  const advice = profileContext ? generateAdvice(profileContext, lang) : null;
  // Het advies onthoudt voor welke gebruiker + taal het is; bij een wissel valt het
  // meteen terug op rule-based, zonder dat het effect state hoeft te resetten.
  const adviceKey = `${userId}:${lang}`;
  const [aiAdviceState, setAiAdviceState] = useState<{ key: string; text: string } | null>(null);
  const aiAdvice = aiAdviceState?.key === adviceKey ? aiAdviceState.text : null;
  useEffect(() => {
    if (!userId || !profileContext) return;
    let cancelled = false;
    getDailyAIAdvice(userId, profileContext, lang)
      .then((text) => { if (!cancelled && text) setAiAdviceState({ key: `${userId}:${lang}`, text }); })
      .catch((e) => console.warn('AI-advies ophalen mislukt', e));
    return () => { cancelled = true; };
  }, [userId, profileContext, lang]);

  // Stappen van vandaag komen uit useDaily (live bij de +-knop), de rest van de week uit Supabase.
  const stepGoal = profileContext?.derived.stepGoal ?? goals.steps;
  const last = (arr: number[] | undefined) => (arr && arr.length ? arr[arr.length - 1] : null);
  const todayCalories = last(stats?.calories);
  const todayProtein = last(stats?.proteinG);
  const todaySleep = stats ? stats.sleepHours[stats.sleepHours.length - 1] : null;
  const statTiles = [
    { key: 'steps', label: t('steps'), value: fmt(progress.steps), goal: `/${fmt(stepGoal)}`, icon: 'footsteps', hue: 'accent',
      spark: stats ? [...stats.steps.slice(0, -1), progress.steps] : [] },
    { key: 'calories', label: t('calories'), value: todayCalories != null ? fmt(todayCalories) : '—', goal: `/${fmt(goals.calories)}`, icon: 'flame', hue: 'calories',
      spark: stats?.calories ?? [] },
    { key: 'protein', label: t('protein'), value: todayProtein != null ? String(todayProtein) : '—', goal: `/${goals.protein}g`, icon: 'target', hue: 'protein',
      spark: stats?.proteinG ?? [] },
    { key: 'sleep', label: t('sleep'), value: todaySleep != null ? formatSleep(todaySleep, t) : '—', goal: `/${goals.sleepHours}${t('hour_short')}`, icon: 'moon', hue: 'sleep',
      spark: stats ? stats.sleepHours.filter((h): h is number => h != null) : [] },
  ];

  // Gewicht: laatste meting, anders de waarde uit onboarding/metingen.
  const weightLogs = stats?.weightLogs ?? [];
  const latestWeight = weightLogs.length ? weightLogs[weightLogs.length - 1].weightKg : measurements.weight;
  const weightChange = weeklyWeightChange(weightLogs);
  const weightSpark = weightLogs.slice(-7).map((l) => l.weightKg);

  // Puntenverdeling van de dagscore. "nutrition" telt in dailyScore.ts (nog) alleen water.
  const [showBreakdown, setShowBreakdown] = useState(false);
  const breakdownRows = [
    { label: t('workout'), points: score.breakdown.workout, max: SCORE_WEIGHTS.workout },
    { label: t('steps'), points: score.breakdown.movement, max: SCORE_WEIGHTS.movement },
    { label: t('water'), points: score.breakdown.nutrition, max: SCORE_WEIGHTS.nutrition },
    { label: t('score_streak_bonus'), points: score.breakdown.streakBonus, max: SCORE_WEIGHTS.streakBonus },
  ];

  // Hulpfunctie: pakt een kleur op naam uit het thema, anders de accentkleur
  const hue = (k: string) => (c as any)[k] || c.accent;

  return (
    <Screen>
      {/* ── Koptekst: logo en begroeting ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 18 }}>
        {/* Vierkant "A"-logo */}
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontWeight: '800', fontSize: 18, color: c.accentText, fontStyle: 'italic' }}>A</Text>
        </View>
        {/* Begroetingstekst */}
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '700', color: c.text }}>{t(greetingKey(new Date().getHours()))}{name ? `, ${name}` : ''} 👋</Text>
          <Text style={{ fontSize: 12.5, color: c.sub, marginTop: 1 }}>{t('home_subtitle')}</Text>
        </View>
      </View>

      {/* ── Dagscore-kaart met ronde grafiek (Ring) ── */}
      <Card accent pad={18} style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 21, fontWeight: '800', color: c.text, letterSpacing: -0.4, lineHeight: 25 }}>{t('score_title')}</Text>
            <Text style={{ fontSize: 12.5, color: c.sub, marginTop: 8, lineHeight: 18, maxWidth: 150 }}>{t('score_desc')}</Text>
            {/* Klapt de puntenverdeling (score.breakdown) onder de kaart open/dicht */}
            <TouchableOpacity activeOpacity={0.7} onPress={() => setShowBreakdown((v) => !v)} style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: c.cardHi, borderWidth: 1, borderColor: c.line, borderRadius: 100, paddingVertical: 7, paddingHorizontal: 13 }}>
              <Text style={{ color: c.text, fontSize: 12.5, fontWeight: '600' }}>{showBreakdown ? t('score_hide_breakdown') : t('score_show_breakdown')}</Text>
              <Icon name={showBreakdown ? 'chevDown' : 'chevR'} size={14} color={c.text} />
            </TouchableOpacity>
          </View>
          {/* De ronde score-grafiek; het getal staat in het midden */}
          <Ring size={132} stroke={13} value={score.score} glow>
            <Text style={{ fontSize: 44, fontWeight: '800', color: c.text, letterSpacing: -1 }}>{score.score}</Text>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: c.accentText, marginTop: 2 }}>
              {score.score >= 80 ? t('score_great') : score.score >= 40 ? t('score_keep_going') : t('score_start')}
            </Text>
          </Ring>
        </View>
        {showBreakdown ? (
          <View style={{ marginTop: 16, gap: 11 }}>
            {breakdownRows.map((row) => (
              <View key={row.label}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={{ fontSize: 12.5, color: c.sub, fontWeight: '600' }}>{row.label}</Text>
                  <Text style={{ fontSize: 12.5, color: c.text, fontWeight: '700' }}>{row.points} / {row.max}</Text>
                </View>
                <Bar value={row.points} max={row.max} color={c.accent} height={6} />
              </View>
            ))}
          </View>
        ) : null}
      </Card>

      {/* ── Streak + XP: de dopamine-feedback van de dagelijkse loop ── */}
      <View style={{ flexDirection: 'row', gap: 11, marginBottom: 18 }}>
        <Card pad={13} style={{ flex: 1, borderRadius: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="flame" size={16} color={c.calories} fill={c.calories} />
            <Text style={{ fontSize: 12.5, color: c.sub, fontWeight: '600' }}>{t('streak')}</Text>
          </View>
          <Text style={{ fontSize: 21, fontWeight: '800', color: c.text, marginTop: 6, letterSpacing: -0.5 }}>
            {streakDays} <Text style={{ fontSize: 12, color: c.dim, fontWeight: '600' }}>{streakDays === 1 ? t('day') : t('days')}</Text>
          </Text>
        </Card>
        <Card pad={13} style={{ flex: 1, borderRadius: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="trophy" size={16} color={c.accentText} />
            <Text style={{ fontSize: 12.5, color: c.sub, fontWeight: '600' }}>{t('level')} {level}</Text>
          </View>
          <Text style={{ fontSize: 11, color: c.dim, marginTop: 7, marginBottom: 6 }}>{xpProgress.current} / {xpProgress.goal} XP</Text>
          <Bar value={xpProgress.current} max={xpProgress.goal} color={c.accent} height={6} />
        </Card>
      </View>

      {/* ── Focus van vandaag: afgeleid van het AI-profiel + voortgang vandaag ── */}
      <Section title={t('todays_focus')} action={t('see_all')} onAction={() => router.push('/plan')} />
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

      {/* ── Statistiek-tegels: één kaartje per item uit statTiles ── */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 11, marginTop: 8, marginBottom: 18 }}>
        {/* .map() = herhaal dit kaartje voor elke statistiek in de data */}
        {statTiles.map((s) => (
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

      {/* ── AI-coach kaart; knop "Praat met je coach" → naar het coach-chatscherm ── */}
      <Section title={t('coach_title')} />
      <Card pad={16} style={{ marginBottom: 18, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Icon name="sparkle" size={15} color={c.accentText} fill={c.accentText} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: c.accentText }}>{t('coach_title')}</Text>
            </View>
            <Text style={{ fontSize: 15.5, fontWeight: '700', color: c.text }}>{advice ? advice.title : t('coach_card_fallback_title')}</Text>
            <Text style={{ fontSize: 12.5, color: c.sub, marginTop: 6, lineHeight: 18 }}>{aiAdvice ?? (advice ? advice.body : t('coach_card_fallback_body'))}</Text>
            <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/coach')} style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', backgroundColor: c.accent, borderRadius: 100, paddingVertical: 9, paddingHorizontal: 15 }}>
              <Icon name="chat" size={15} color={c.onAccent} />
              <Text style={{ color: c.onAccent, fontSize: 13, fontWeight: '700' }}>{t('talk_to_coach')}</Text>
            </TouchableOpacity>
          </View>
          {/* Coach-icoon */}
          <View style={{ width: 96, alignSelf: 'stretch', borderRadius: 14, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
            <Icon name="sparkle" size={40} color={c.accentText} fill={c.accentText} />
          </View>
        </View>
      </Card>

      {/* ── Voortgang: gewicht-kaart, klikbaar → naar progress-scherm ── */}
      <Section title={t('progress')} action={t('see_all')} onAction={() => router.push('/progress')} />
      <Card onPress={() => router.push('/progress')} pad={15} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chart" size={19} color={c.accentText} />
        </View>
        <View>
          <Text style={{ fontSize: 12, color: c.sub, fontWeight: '600' }}>{t('weight')}</Text>
          <Text style={{ fontSize: 19, fontWeight: '800', color: c.text, letterSpacing: -0.5 }}>{latestWeight > 0 ? latestWeight.toFixed(1) : '—'} <Text style={{ fontSize: 12, fontWeight: '600', color: c.sub }}>kg</Text></Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Sparkline data={weightSpark} color={c.accent} w={96} h={34} />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {weightChange != null ? (
            <>
              <Text style={{ fontSize: 14, fontWeight: '700', color: weightChange <= 0 ? c.accentText : c.bad }}>
                {weightChange > 0 ? '+' : weightChange < 0 ? '−' : ''}{Math.abs(weightChange).toFixed(1)} kg
              </Text>
              <Text style={{ fontSize: 11, color: c.dim }}>{t('vs_last_week')}</Text>
            </>
          ) : (
            <Text style={{ fontSize: 11, color: c.dim }}>{t('log_weekly_trend')}</Text>
          )}
        </View>
      </Card>
    </Screen>
  );
}