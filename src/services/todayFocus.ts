// src/services/todayFocus.ts — "Today's Focus" lijst v1
// Zet het AI profile object (Sprint 2) + de voortgang van vandaag om in een
// lijst van concrete taken voor de dashboard. Zuivere functie, geen state of
// side-effects, dus makkelijk te testen los van de UI.
import type { AIProfile } from '@/src/types/aiProfile';
import type { DailyProgress } from '@/src/types/daily';
import type { IconName } from '@/components/Icon';
import { LOCALES, type Lang } from '@/constants/i18n';
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

export function buildTodayFocus(profile: AIProfile | null, progress: DailyProgress, goals: FocusGoals, lang: Lang = 'nl'): FocusTask[] {
  const nl = lang === 'nl';
  const num = (n: number) => n.toLocaleString(LOCALES[lang]);
  const litres = (n: number) => num(Math.round(n * 100) / 100);
  const tasks: FocusTask[] = [];

  tasks.push({
    id: 'workout',
    icon: 'dumbbell',
    title: nl ? 'Rond je workout af' : 'Complete your workout',
    subtitle: profile
      ? (nl
        ? `${profile.derived.recommendedTrainingDaysPerWeek}x/week aanbevolen voor jou`
        : `${profile.derived.recommendedTrainingDaysPerWeek}x/week recommended for you`)
      : (nl ? 'Train vandaag' : 'Train today'),
    done: progress.workoutDone,
    xp: XP_REWARDS.workout,
  });

  const stepGoal = profile?.derived.stepGoal ?? goals.steps;
  tasks.push({
    id: 'steps',
    icon: 'footsteps',
    title: nl ? `Haal ${num(stepGoal)} stappen` : `Hit ${num(stepGoal)} steps`,
    subtitle: `${num(progress.steps)} / ${num(stepGoal)} ${nl ? 'stappen' : 'steps'}`,
    done: progress.steps >= stepGoal,
    xp: XP_REWARDS.steps,
  });

  tasks.push({
    id: 'water',
    icon: 'droplet',
    title: nl ? `Drink ${litres(goals.water)} L water` : `Drink ${litres(goals.water)} L of water`,
    subtitle: `${litres(progress.waterL)} / ${litres(goals.water)} L`,
    done: progress.waterL >= goals.water,
    xp: XP_REWARDS.water,
  });

  if (profile) {
    const { derived, answers } = profile;
    if (derived.recoveryRisk !== 'low') {
      tasks.push({
        id: 'recovery',
        icon: 'moon',
        title: nl ? 'Neem een herstelmoment' : 'Take a recovery moment',
        subtitle: derived.recoveryRisk === 'high'
          ? (nl ? 'Slaap en stress wijzen op een hoger herstelrisico' : 'Sleep & stress point to a higher recovery risk')
          : (nl ? 'Wat extra rust helpt je herstellen' : 'A bit more rest will help you recover'),
        done: false,
        xp: 0,
      });
    } else if (answers.alcohol || answers.smoking) {
      tasks.push({
        id: 'habit',
        icon: 'leaf',
        title: nl ? 'Sla vandaag alcohol en roken over' : 'Skip alcohol & smoking today',
        subtitle: nl ? 'Minderen versnelt je vooruitgang' : 'Cutting back speeds up your progress',
        done: false,
        xp: 0,
      });
    }
  }

  return tasks;
}
