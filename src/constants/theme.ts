/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    // Compatibility aliases used across the app
    bg: '#ffffff',
    card: '#ffffff',
    cardLo: '#FBFBFD',
    accent: '#208AEF',
    accentSoft: '#E6F2FF',
    accentText: '#FFFFFF',
    onAccent: '#FFFFFF',
    track: '#E9EEF6',
    line: '#E6E9EE',
    dim: '#8A8A8F',
    sub: '#60646C',
    faint: '#F4F6F8',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    // Compatibility aliases used across the app
    bg: '#000000',
    card: '#121214',
    cardLo: '#18181A',
    accent: '#208AEF',
    accentSoft: '#153b5a',
    accentText: '#FFFFFF',
    onAccent: '#FFFFFF',
    track: '#1F2933',
    line: '#2A2D31',
    dim: '#9AA0A6',
    sub: '#B0B4BA',
    faint: '#0B0C0D',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// Backwards-compatible exports expected by other files
export const LIGHT = Colors.light;
export const DARK = Colors.dark;
export type Palette = Record<string, string>;
