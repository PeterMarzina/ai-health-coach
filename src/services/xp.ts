// src/services/xp.ts — XP-systeem v1
// Kent XP toe per voltooide actie. XP_REWARDS is de enige plek waar je de
// puntentelling hoeft aan te passen. 100 XP per level, puur ter illustratie.

export const XP_REWARDS = {
  workout: 30,
  steps: 15,
  water: 10,
} as const;

export type XpAction = keyof typeof XP_REWARDS;

const XP_PER_LEVEL = 100;

export function levelFromXp(xpTotal: number): number {
  return Math.floor(Math.max(0, xpTotal) / XP_PER_LEVEL) + 1;
}

export function xpIntoLevel(xpTotal: number): { current: number; goal: number } {
  return { current: Math.max(0, xpTotal) % XP_PER_LEVEL, goal: XP_PER_LEVEL };
}
