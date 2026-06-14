// components/store.tsx — Theme + Settings providers
import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { DARK, LIGHT, Palette } from '@/constants/theme';
import { DEFAULT_GOALS, DEFAULT_MEASUREMENTS } from '@/constants/data';

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
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS);
  const [measurements, setMeasurements] = useState<Measurements>(DEFAULT_MEASUREMENTS);
  const value = useMemo(() => ({ goals, setGoals, measurements, setMeasurements }), [goals, measurements]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsCtx {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
