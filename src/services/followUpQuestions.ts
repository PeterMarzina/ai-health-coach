// src/services/followUpQuestions.ts — genereert 1-3 gerichte vervolgvragen
// o.b.v. de standaard-onboardingantwoorden. Puur regel-/template-gestuurd
// (geen externe AI-API) — de flow is er wel al op voorbereid om dit later
// te vervangen door een echte AI-call zonder de rest van de onboarding aan
// te hoeven passen (zelfde input/output-vorm).
import type { ActivityLevel, FitnessLevel, Goal, RoutineType } from '@/src/types/aiProfile';
import type { Lang } from '@/constants/i18n';

export interface FollowUpOption {
  value: string;
  label: string;
}

export interface FollowUpQuestion {
  id: string;
  question: string;
  type: 'choice';
  options: FollowUpOption[];
}

// Alleen de standaardantwoorden die al bekend zijn vóórdat de vervolgvragen worden getoond.
export interface BaseAnswers {
  goal: Goal;
  fitnessLevel: FitnessLevel;
  trainingDaysPerWeek: number;
  routineTypes: RoutineType[];
  sleepHours: number;
  stressLevel: number;
  activityLevel: ActivityLevel;
}

const MAX_QUESTIONS = 3;

export function generateFollowUpQuestions(a: BaseAnswers, lang: Lang): FollowUpQuestion[] {
  const questions: FollowUpQuestion[] = [];

  // Doel = afvallen/spieropbouw → voedingspatroon is dan direct relevant.
  if (a.goal === 'lose' || a.goal === 'muscle') {
    questions.push({
      id: 'diet_pattern',
      question: lang === 'nl'
        ? 'Hoe zou je je huidige voedingspatroon omschrijven?'
        : 'How would you describe your current eating pattern?',
      type: 'choice',
      options: lang === 'nl'
        ? [
            { value: 'balanced', label: 'Gebalanceerd' },
            { value: 'high_protein', label: 'Veel eiwitten' },
            { value: 'low_carb', label: 'Weinig koolhydraten' },
            { value: 'irregular', label: 'Onregelmatig' },
          ]
        : [
            { value: 'balanced', label: 'Balanced' },
            { value: 'high_protein', label: 'High protein' },
            { value: 'low_carb', label: 'Low carb' },
            { value: 'irregular', label: 'Irregular' },
          ],
    });
  }

  // Weinig slaap → slaapritme is relevant voor herstel.
  if (a.sleepHours < 6) {
    questions.push({
      id: 'sleep_schedule',
      question: lang === 'nl'
        ? 'Ga je meestal rond dezelfde tijd naar bed?'
        : 'Do you usually go to bed around the same time?',
      type: 'choice',
      options: lang === 'nl'
        ? [
            { value: 'consistent', label: 'Ja, best vast' },
            { value: 'varies', label: 'Wisselt sterk' },
          ]
        : [
            { value: 'consistent', label: 'Yes, fairly consistent' },
            { value: 'varies', label: 'Varies a lot' },
          ],
    });
  }

  // Hoge stress → welke ontspanning gebruikt de gebruiker al (of niet)?
  if (a.stressLevel >= 4) {
    questions.push({
      id: 'stress_management',
      question: lang === 'nl'
        ? 'Doe je al iets om stress te verlagen?'
        : 'Do you already do anything to manage stress?',
      type: 'choice',
      options: lang === 'nl'
        ? [
            { value: 'none', label: 'Nee, niks' },
            { value: 'meditation', label: 'Meditatie/ademhaling' },
            { value: 'exercise', label: 'Bewegen/sporten' },
            { value: 'other', label: 'Iets anders' },
          ]
        : [
            { value: 'none', label: 'No, nothing' },
            { value: 'meditation', label: 'Meditation/breathing' },
            { value: 'exercise', label: 'Exercise' },
            { value: 'other', label: 'Something else' },
          ],
    });
  }

  // Nog geen vaste routine → wat houdt de gebruiker tegen om te starten?
  if (a.trainingDaysPerWeek === 0 || a.routineTypes.includes('none')) {
    questions.push({
      id: 'training_barrier',
      question: lang === 'nl'
        ? 'Wat is voor jou de grootste drempel om te gaan trainen?'
        : "What's the biggest barrier for you to start training?",
      type: 'choice',
      options: lang === 'nl'
        ? [
            { value: 'time', label: 'Tijd' },
            { value: 'motivation', label: 'Motivatie' },
            { value: 'knowledge', label: 'Weten wat te doen' },
            { value: 'injury', label: 'Blessure/klacht' },
          ]
        : [
            { value: 'time', label: 'Time' },
            { value: 'motivation', label: 'Motivation' },
            { value: 'knowledge', label: 'Knowing what to do' },
            { value: 'injury', label: 'Injury/complaint' },
          ],
    });
  }

  // Wil fitter worden maar laag dagelijks activiteitsniveau → beweegvoorkeur.
  if (a.goal === 'fit' && a.activityLevel === 'low') {
    questions.push({
      id: 'movement_preference',
      question: lang === 'nl'
        ? 'Wat spreekt je het meest aan om vaker te bewegen?'
        : 'What appeals to you most for moving more often?',
      type: 'choice',
      options: lang === 'nl'
        ? [
            { value: 'walking', label: 'Wandelen' },
            { value: 'cycling', label: 'Fietsen' },
            { value: 'group_sport', label: 'Teamsport' },
            { value: 'gym', label: 'Sportschool' },
          ]
        : [
            { value: 'walking', label: 'Walking' },
            { value: 'cycling', label: 'Cycling' },
            { value: 'group_sport', label: 'Team sport' },
            { value: 'gym', label: 'Gym' },
          ],
    });
  }

  return questions.slice(0, MAX_QUESTIONS);
}
