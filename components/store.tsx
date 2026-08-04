// components/store.tsx — gedeelde "providers" voor thema en instellingen
// ThemeProvider + useTheme(): geeft elk scherm het juiste kleurenpalet (licht/donker)
//   en een toggle() om te wisselen. Gebruik in een scherm: const { c } = useTheme();
// SettingsProvider + useSettings(): bewaart je doelen (goals) en metingen (measurements)
//   zodat alle schermen ze kunnen lezen én aanpassen.
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { DARK, LIGHT, Palette } from '@/constants/theme';
import { DEFAULT_GOALS, DEFAULT_MEASUREMENTS } from '@/constants/data';
import { supabase } from '../src/lib/supabase'; // verbinding met de backend (Supabase)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Lang, TKey } from '@/constants/i18n';
import type { Session } from '@supabase/supabase-js';
import type { AIProfile } from '@/src/types/aiProfile';
import type { DailyProgress } from '@/src/types/daily';
import { emptyDailyProgress, hasAnyActivity } from '@/src/types/daily';
import { calculateDailyScore, DailyScoreResult } from '@/src/services/dailyScore';
import { nextStreak as computeNextStreak, toDateKey } from '@/src/services/streak';
import { XP_REWARDS, levelFromXp, xpIntoLevel } from '@/src/services/xp';
import { buildTodayFocus, FocusTask } from '@/src/services/todayFocus';

type Mode = 'light' | 'dark';

type ThemeCtx = { c: Palette; mode: Mode; toggle: () => void; setMode: (m: Mode) => void };
const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<Mode>(system === 'light' ? 'light' : 'dark');
  const value = useMemo<ThemeCtx>(() => ({
    c: mode === 'dark' ? DARK : LIGHT,
    mode,
    setMode,
    toggle: () => setMode((m) => (m === 'dark' ? 'light' : 'dark')),
  }), [mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

// ── Settings (editable goals + measurements) ─────────────────
type Goals = typeof DEFAULT_GOALS;
type Measurements = typeof DEFAULT_MEASUREMENTS;
type SettingsCtx = {
  goals: Goals;
  setGoals: (g: Goals) => void;
  measurements: Measurements;
  setMeasurements: (m: Measurements) => void;
  // Het "AI profile object" uit onboarding (zie src/types/aiProfile.ts).
  // null = nog niet geladen/ingevuld.
  profileContext: AIProfile | null;
  setProfileContext: (p: AIProfile) => void;
  // Herlaadt goals/measurements/profiel uit Supabase — nodig nadat de AI-coach
  // via een action tool (bv. adjust_nutrition_targets) server-side iets wijzigde.
  refreshSettings: () => void;
};
const SettingsContext = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // Lokale kopie van de gegevens (start met de standaardwaarden).
  const [goals, setGoalsState] = useState<Goals>(DEFAULT_GOALS);
  const [measurements, setMeasurementsState] = useState<Measurements>(DEFAULT_MEASUREMENTS);
  const [profileContext, setProfileContextState] = useState<AIProfile | null>(null);
  // Wie is er ingelogd? (null = niemand). Nodig om naar de juiste profiel-rij te schrijven.
  const [userId, setUserId] = useState<string | null>(null);

  // ── LADEN: haal de opgeslagen doelen/metingen/AI-profiel op uit Supabase ──
  // Leest de 'profiles'-rij van deze gebruiker. Is een veld leeg, dan blijven de defaults staan.
  async function loadFromSupabase(id: string) {
    const { data } = await supabase
      .from('profiles')
      .select('goals, measurements, profile_context')
      .eq('id', id)
      .single();
    if (data?.goals) setGoalsState({ ...DEFAULT_GOALS, ...data.goals });
    if (data?.measurements) setMeasurementsState({ ...DEFAULT_MEASUREMENTS, ...data.measurements });
    if (data?.profile_context) setProfileContextState(data.profile_context as AIProfile);
  }

  // Bij opstarten: kijk of er al iemand is ingelogd, en luister naar in-/uitloggen.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.id ?? null;
      setUserId(id);
      if (id) loadFromSupabase(id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user?.id ?? null;
      setUserId(id);
      if (id) {
        loadFromSupabase(id);            // nieuwe gebruiker → diens gegevens laden
      } else {
        setGoalsState(DEFAULT_GOALS);    // uitgelogd → terug naar standaard
        setMeasurementsState(DEFAULT_MEASUREMENTS);
        setProfileContextState(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // ── OPSLAAN: update lokaal én schrijf terug naar Supabase ──
  // De schermen (goals.tsx / measurements.tsx) roepen deze functies aan bij "Opslaan".
  const setGoals = (g: Goals) => {
    setGoalsState(g);                                     // direct zichtbaar in de app
    if (userId) {
      supabase.from('profiles').upsert({ id: userId, goals: g, updated_at: new Date() });
    }
  };
  const setMeasurements = (m: Measurements) => {
    setMeasurementsState(m);
    if (userId) {
      supabase.from('profiles').upsert({ id: userId, measurements: m, updated_at: new Date() });
    }
  };
  // Wordt na onboarding aangeroepen; de rij zelf is dan al opgeslagen door onboarding.tsx,
  // dit houdt alleen de lokale state (voor bv. de AI Coach-kaart) in sync.
  const setProfileContext = (p: AIProfile) => setProfileContextState(p);

  const refreshSettings = () => {
    if (userId) loadFromSupabase(userId);
  };

  const value = useMemo(() => ({ goals, setGoals, measurements, setMeasurements, profileContext, setProfileContext, refreshSettings }), [goals, measurements, profileContext, userId]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsCtx {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

// ── Taal (Nederlands / Engels) ───────────────────────────────
// lang = de gekozen taal, setLang() wisselt + onthoudt 'm op het toestel,
// t('sleutel') geeft de juiste vertaling terug (uit constants/i18n.ts).
type LangCtx = { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string };
const LanguageContext = createContext<LangCtx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('nl'); // standaard Nederlands

  // Bij opstarten de eerder gekozen taal terughalen van het toestel.
  useEffect(() => {
    AsyncStorage.getItem('lang').then((v) => {
      if (v === 'nl' || v === 'en') setLangState(v);
    });
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem('lang', l); // onthouden voor de volgende keer
  };

  // De vertaalfunctie: zoekt de tekst op; valt terug op de sleutel als die ontbreekt.
  const t = (k: TKey) => translations[lang][k] ?? k;

  const value = useMemo<LangCtx>(() => ({ lang, setLang, t }), [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang(): LangCtx {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}

// ── Auth (wie is ingelogd + is het profiel al ingevuld?) ─────
// session    = de ingelogde gebruiker (of null)
// onboarded  = is de vragenlijst al ingevuld? (null = nog aan het checken)
// loading    = nog bezig de sessie op te halen
// markOnboarded() = roept het onboarding-scherm aan zodra het profiel is opgeslagen,
//   zodat de poort meteen doorstuurt naar de tabs.
type AuthCtx = {
  session: Session | null;
  onboarded: boolean | null;
  loading: boolean;
  markOnboarded: () => void;
};
const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  // Bestaande sessie ophalen + luisteren naar in-/uitloggen.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Zodra er een sessie is: kijk of het profiel al is ingevuld (full_name aanwezig?).
  useEffect(() => {
    if (!session) { setOnboarded(null); return; }
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setOnboarded(!!data?.full_name));
  }, [session]);

  const markOnboarded = () => setOnboarded(true);

  const value = useMemo<AuthCtx>(() => ({ session, onboarded, loading, markOnboarded }), [session, onboarded, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ── Daily loop (Sprint 3): dagscore, focus-lijst, streak & XP ────────
// Combineert vandaag's voortgang (workout/stappen/water) met het AI-profiel
// en de doelen tot een dagscore + focus-lijst, en houdt de cumulatieve
// streak/XP bij op `profiles`. Voortgang van vandaag leeft in `daily_progress`
// zodat een herstart of ander toestel dezelfde dag laat zien.
type DailyCtx = {
  progress: DailyProgress;
  streakDays: number;
  xpTotal: number;
  level: number;
  xpProgress: { current: number; goal: number };
  score: DailyScoreResult;
  focusTasks: FocusTask[];
  toggleWorkout: () => void;
  addSteps: (n: number) => void;
  addWater: (litres: number) => void;
};
const DailyContext = createContext<DailyCtx | null>(null);

export function DailyProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { goals, profileContext } = useSettings();
  const userId = session?.user?.id ?? null;
  // Simpel gehouden voor v1: één keer bepaald bij het opstarten van deze provider.
  // Blijft de app open over middernacht heen, dan telt "vandaag" pas na herstart.
  const [todayKey] = useState(() => toDateKey(new Date()));

  const [progress, setProgress] = useState<DailyProgress>(() => emptyDailyProgress(todayKey));
  const [streakDays, setStreakDays] = useState(0);
  const [xpTotal, setXpTotal] = useState(0);
  const [lastActiveDate, setLastActiveDate] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setProgress(emptyDailyProgress(todayKey));
      setStreakDays(0);
      setXpTotal(0);
      setLastActiveDate(null);
      return;
    }

    (async () => {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('streak_days, xp_total, last_active_date')
        .eq('id', userId)
        .single();
      setStreakDays(profileRow?.streak_days ?? 0);
      setXpTotal(profileRow?.xp_total ?? 0);
      setLastActiveDate(profileRow?.last_active_date ?? null);

      const { data: dayRow } = await supabase
        .from('daily_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('date', todayKey)
        .maybeSingle();
      setProgress(dayRow ? {
        date: dayRow.date,
        workoutDone: dayRow.workout_done,
        steps: dayRow.steps,
        waterL: Number(dayRow.water_l),
        xpAwarded: dayRow.xp_awarded ?? emptyDailyProgress(todayKey).xpAwarded,
      } : emptyDailyProgress(todayKey));
    })();
  }, [userId, todayKey]);

  // Slaat de nieuwe dagvoortgang op (lokaal + Supabase). `newlyEarnedXp` > 0
  // betekent dat dit de eerste keer is dat een taak vandaag is voltooid —
  // dan telt ook de streak mee (max 1x per dag opgehoogd).
  function commitProgress(next: DailyProgress, newlyEarnedXp: number) {
    const isFirstActionToday = newlyEarnedXp > 0 && !hasAnyActivity(progress);
    const nextStreakDays = isFirstActionToday ? computeNextStreak(lastActiveDate, streakDays, todayKey) : streakDays;
    const nextLastActive = isFirstActionToday ? todayKey : lastActiveDate;
    const nextXpTotal = xpTotal + newlyEarnedXp;

    setProgress(next);
    if (isFirstActionToday) {
      setStreakDays(nextStreakDays);
      setLastActiveDate(nextLastActive);
    }
    if (newlyEarnedXp > 0) setXpTotal(nextXpTotal);

    if (!userId) return;
    supabase.from('daily_progress').upsert({
      user_id: userId,
      date: next.date,
      workout_done: next.workoutDone,
      steps: next.steps,
      water_l: next.waterL,
      xp_awarded: next.xpAwarded,
      updated_at: new Date(),
    });
    if (newlyEarnedXp > 0) {
      supabase.from('profiles').upsert({
        id: userId,
        xp_total: nextXpTotal,
        streak_days: nextStreakDays,
        last_active_date: nextLastActive,
        updated_at: new Date(),
      });
    }
  }

  const toggleWorkout = () => {
    const willBeDone = !progress.workoutDone;
    const justCompleted = willBeDone && !progress.xpAwarded.workout;
    commitProgress({
      ...progress,
      workoutDone: willBeDone,
      xpAwarded: { ...progress.xpAwarded, workout: progress.xpAwarded.workout || willBeDone },
    }, justCompleted ? XP_REWARDS.workout : 0);
  };

  const stepGoal = profileContext?.derived.stepGoal ?? goals.steps;
  const addSteps = (n: number) => {
    const steps = Math.max(0, progress.steps + n);
    const reachedGoal = steps >= stepGoal;
    const justCompleted = reachedGoal && !progress.xpAwarded.steps;
    commitProgress({
      ...progress,
      steps,
      xpAwarded: { ...progress.xpAwarded, steps: progress.xpAwarded.steps || reachedGoal },
    }, justCompleted ? XP_REWARDS.steps : 0);
  };

  const addWater = (litres: number) => {
    const waterL = Math.round(Math.max(0, progress.waterL + litres) * 100) / 100;
    const reachedGoal = waterL >= goals.water;
    const justCompleted = reachedGoal && !progress.xpAwarded.water;
    commitProgress({
      ...progress,
      waterL,
      xpAwarded: { ...progress.xpAwarded, water: progress.xpAwarded.water || reachedGoal },
    }, justCompleted ? XP_REWARDS.water : 0);
  };

  const score = useMemo(() => calculateDailyScore({
    workoutDone: progress.workoutDone,
    steps: progress.steps,
    stepGoal,
    waterL: progress.waterL,
    waterGoalL: goals.water,
    streakDays,
  }), [progress, stepGoal, goals.water, streakDays]);

  const focusTasks = useMemo(
    () => buildTodayFocus(profileContext, progress, { steps: stepGoal, water: goals.water }),
    [profileContext, progress, stepGoal, goals.water]
  );

  const value = useMemo<DailyCtx>(() => ({
    progress,
    streakDays,
    xpTotal,
    level: levelFromXp(xpTotal),
    xpProgress: xpIntoLevel(xpTotal),
    score,
    focusTasks,
    toggleWorkout,
    addSteps,
    addWater,
  }), [progress, streakDays, xpTotal, score, focusTasks]);

  return <DailyContext.Provider value={value}>{children}</DailyContext.Provider>;
}

export function useDaily(): DailyCtx {
  const ctx = useContext(DailyContext);
  if (!ctx) throw new Error('useDaily must be used within DailyProvider');
  return ctx;
}
