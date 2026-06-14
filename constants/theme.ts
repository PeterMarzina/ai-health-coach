// constants/theme.ts — de kleurenpaletten (licht en donker)
// 'Palette' beschrijft welke kleuren er bestaan (bg, card, text, accent, ...).
// LIGHT en DARK vullen die kleuren in. useTheme() kiest automatisch de juiste.
// withAlpha(kleur, 0.15) maakt een kleur doorzichtiger.
export type Palette = {
  bg: string;
  card: string;
  cardHi: string;
  cardLo: string;
  line: string;
  lineHi: string;
  text: string;
  sub: string;
  dim: string;
  faint: string;
  accent: string;        // fills (rings, buttons, bars)
  accentText: string;    // accent-colored text/icons (contrast-safe)
  accentSoft: string;    // tinted bg behind accent icons
  onAccent: string;      // text/icon color ON an accent fill
  track: string;         // chart/track background
  bad: string;
  // data hues
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
  water: string;
  sleep: string;
  // status bar style
  statusBar: 'light' | 'dark';
};

export const DARK: Palette = {
  bg: '#0D0D0D',
  card: '#171717',
  cardHi: '#1E1E1E',
  cardLo: '#121212',
  line: 'rgba(255,255,255,0.07)',
  lineHi: 'rgba(255,255,255,0.12)',
  text: '#F4F4F4',
  sub: 'rgba(255,255,255,0.52)',
  dim: 'rgba(255,255,255,0.34)',
  faint: 'rgba(255,255,255,0.16)',
  accent: '#A3E635',
  accentText: '#A3E635',
  accentSoft: 'rgba(163,230,53,0.14)',
  onAccent: '#0D0D0D',
  track: 'rgba(255,255,255,0.08)',
  bad: '#F87171',
  calories: '#FB7C4D',
  protein: '#A78BFA',
  carbs: '#FB923C',
  fats: '#FACC15',
  water: '#38BDF8',
  sleep: '#818CF8',
  statusBar: 'light',
};

export const LIGHT: Palette = {
  bg: '#F4F4F5',
  card: '#FFFFFF',
  cardHi: '#FFFFFF',
  cardLo: '#FAFAFA',
  line: 'rgba(0,0,0,0.07)',
  lineHi: 'rgba(0,0,0,0.12)',
  text: '#18181B',
  sub: 'rgba(0,0,0,0.55)',
  dim: 'rgba(0,0,0,0.40)',
  faint: 'rgba(0,0,0,0.14)',
  accent: '#84CC16',
  accentText: '#4D7C0F',
  accentSoft: 'rgba(132,204,22,0.16)',
  onAccent: '#1A2E05',
  track: 'rgba(0,0,0,0.07)',
  bad: '#DC2626',
  calories: '#EA580C',
  protein: '#7C3AED',
  carbs: '#EA580C',
  fats: '#CA8A04',
  water: '#0284C7',
  sleep: '#4F46E5',
  statusBar: 'dark',
};

// hex (#RRGGBB or #RGB) + alpha → rgba()
export function withAlpha(hex: string, a: number): string {
  if (!hex.startsWith('#')) return hex;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
