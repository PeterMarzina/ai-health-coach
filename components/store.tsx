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
};
const SettingsContext = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // Lokale kopie van de gegevens (start met de standaardwaarden).
  const [goals, setGoalsState] = useState<Goals>(DEFAULT_GOALS);
  const [measurements, setMeasurementsState] = useState<Measurements>(DEFAULT_MEASUREMENTS);
  // Wie is er ingelogd? (null = niemand). Nodig om naar de juiste profiel-rij te schrijven.
  const [userId, setUserId] = useState<string | null>(null);

  // ── LADEN: haal de opgeslagen doelen/metingen op uit Supabase ──
  // Leest de 'profiles'-rij van deze gebruiker. Is een veld leeg, dan blijven de defaults staan.
  async function loadFromSupabase(id: string) {
    const { data } = await supabase
      .from('profiles')
      .select('goals, measurements')
      .eq('id', id)
      .single();
    if (data?.goals) setGoalsState({ ...DEFAULT_GOALS, ...data.goals });
    if (data?.measurements) setMeasurementsState({ ...DEFAULT_MEASUREMENTS, ...data.measurements });
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

  const value = useMemo(() => ({ goals, setGoals, measurements, setMeasurements }), [goals, measurements, userId]);
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
