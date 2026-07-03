// src/services/todayFocus.ts — "Today's Focus" lijst v1
// Zet het AI profile object (Sprint 2) + de voortgang van vandaag om in een
// lijst van concrete taken voor de dashboard. Zuivere functie, geen state of
// side-effects, dus makkelijk te testen los van de UI.
import type { AIProfile } from '@/src/types/aiProfile';
import type { DailyProgress } from '@/src/types/daily';
import type { IconName } from '@/components/Icon';
import { XP_REWARDS } from '@/src/services/xp';

export interface FocusTask {
  id: string;
  icon: IconName;
  title: string;
  subtitle: string;
  done: boolean;
  xp: number; // 0 = puur informatief, geeft geen XP
}

export interface FocusGoals {
  steps: number;
  water: number; // litres
}

export function buildTodayFocus(profile: AIProfile | null, progress: DailyProgress, goals: FocusGoals): FocusTask[] {
  const tasks: FocusTask[] = [];

  tasks.push({
    id: 'workout',
    icon: 'dumbbell',
    title: 'Complete your workout',
    subtitle: profile
      ? `${profile.derived.recommendedTrainingDaysPerWeek}x/week recommended for you`
      : 'Train today',
    done: progress.workoutDone,
    xp: XP_REWARDS.workout,
  });

  const stepGoal = profile?.derived.stepGoal ?? goals.steps;
  tasks.push({
    id: 'steps',
    icon: 'footsteps',
    title: `Hit ${stepGoal.toLocaleString()} steps`,
    subtitle: `${progress.steps.toLocaleString()} / ${stepGoal.toLocaleString()} steps`,
    done: progress.steps >= stepGoal,
    xp: XP_REWARDS.steps,
  });

  tasks.push({
    id: 'water',
    icon: 'droplet',
    title: `Drink ${goals.water}L of water`,
    subtitle: `${progress.waterL.toFixed(2)} / ${goals.water}L`,
    done: progress.waterL >= goals.water,
    xp: XP_REWARDS.water,
  });

  if (profile) {
    const { derived, answers } = profile;
    if (derived.recoveryRisk !== 'low') {
      tasks.push({
        id: 'recovery',
        icon: 'moon',
        title: 'Take a recovery moment',
        subtitle: derived.recoveryRisk === 'high'
          ? 'Sleep & stress point to a higher recovery risk'
          : 'A bit more rest will help you recover',
        done: false,
        xp: 0,
      });
    } else if (answers.alcohol || answers.smoking) {
      tasks.push({
        id: 'habit',
        icon: 'leaf',
        title: 'Skip alcohol & smoking today',
        subtitle: 'Cutting back speeds up your progress',
        done: false,
        xp: 0,
      });
    }
  }

  return tasks;
}
