// src/services/adviceGenerator.ts — rule-based advies uit het AI profile object
// generateAdvice() zet het profiel om in een korte, persoonlijke tekst.
// Puur if/else + templates — geen externe AI-API. In een latere sprint kan
// hetzelfde AIProfile-object als input dienen voor een echte AI-prompt.
import type { AIProfile } from '@/src/types/aiProfile';
import type { Lang } from '@/constants/i18n';

export interface Advice {
  title: string;
  body: string;
}

const GOAL_LABEL: Record<AIProfile['answers']['goal'], Record<Lang, string>> = {
  lose: { nl: 'afvallen', en: 'losing weight' },
  muscle: { nl: 'spieropbouw', en: 'building muscle' },
  fit: { nl: 'fitter worden', en: 'getting fitter' },
  maintain: { nl: 'op gewicht blijven', en: 'maintaining your weight' },
};

export function generateAdvice(profile: AIProfile, lang: Lang = 'nl'): Advice {
  const { answers, derived } = profile;
  const goalLabel = GOAL_LABEL[answers.goal][lang];
  const sentences: string[] = [];

  // Openingszin: naam + doel + calorie-/eiwitdoel.
  if (lang === 'nl') {
    sentences.push(
      `Hoi ${answers.name}, je focus is ${goalLabel}. We mikken op ~${derived.calorieTarget} kcal en ${derived.proteinTargetG}g eiwit per dag.`
    );
  } else {
    sentences.push(
      `Hi ${answers.name}, your focus is ${goalLabel}. We're aiming for ~${derived.calorieTarget} kcal and ${derived.proteinTargetG}g protein per day.`
    );
  }

  // Trainingsfrequentie: huidige routine vs. aanbevolen.
  if (answers.trainingDaysPerWeek < derived.recommendedTrainingDaysPerWeek) {
    sentences.push(
      lang === 'nl'
        ? `Je traint nu ${answers.trainingDaysPerWeek}x per week — voor jouw niveau raden we ${derived.recommendedTrainingDaysPerWeek}x aan.`
        : `You currently train ${answers.trainingDaysPerWeek}x/week — for your level we recommend ${derived.recommendedTrainingDaysPerWeek}x.`
    );
  } else {
    sentences.push(
      lang === 'nl'
        ? `Je trainingsfrequentie (${answers.trainingDaysPerWeek}x per week) past goed bij je niveau.`
        : `Your training frequency (${answers.trainingDaysPerWeek}x/week) fits your level well.`
    );
  }

  // Herstel: slaap + stress.
  if (derived.recoveryRisk === 'high') {
    sentences.push(
      lang === 'nl'
        ? `Je slaap en stressniveau wijzen op een verhoogd herstelrisico — bouw extra rustdagen in.`
        : `Your sleep and stress levels suggest a higher recovery risk — build in extra rest days.`
    );
  } else if (derived.recoveryRisk === 'medium') {
    sentences.push(
      lang === 'nl'
        ? `Let goed op herstel: iets meer slaap of ontspanning kan al veel schelen.`
        : `Keep an eye on recovery: a bit more sleep or relaxation can make a real difference.`
    );
  }

  // Habits: alcohol/roken.
  if (answers.alcohol || answers.smoking) {
    sentences.push(
      lang === 'nl'
        ? `Alcohol en/of roken minderen versnelt je vooruitgang richting ${goalLabel}.`
        : `Cutting back on alcohol and/or smoking will speed up your progress towards ${goalLabel}.`
    );
  }

  // Vervolgvragen: onregelmatig eetpatroon verdient een expliciete tip.
  const dietPattern = answers.followUps.find((f) => f.id === 'diet_pattern');
  if (dietPattern?.answer === 'irregular') {
    sentences.push(
      lang === 'nl'
        ? `Probeer vaste eetmomenten aan te houden — dat maakt je calorie-/eiwitdoel makkelijker haalbaar.`
        : `Try sticking to fixed meal times — that makes your calorie/protein target easier to hit.`
    );
  }

  return {
    title: lang === 'nl' ? 'Jouw persoonlijke advies' : 'Your personal advice',
    body: sentences.join(' '),
  };
}
