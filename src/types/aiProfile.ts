// src/types/aiProfile.ts — schema van het "AI profile object"
//
// Dit object bundelt (1) alles wat de gebruiker tijdens onboarding invult
// (OnboardingAnswers) en (2) kenmerken die we daaruit afleiden (derived).
// Het wordt opgeslagen als JSON in de kolom `profiles.profile_context` en
// dient in latere sprints als input voor echte AI-features (bv. een prompt
// die naar een taalmodel gaat). Nu voedt het alleen de rule-based advies-
// generator (zie src/services/adviceGenerator.ts).
//
// Schema:
// {
//   version: 1,
//   answers: OnboardingAnswers,   // ruwe antwoorden uit de vragenlijst
//   derived: DerivedProfile,      // berekende/afgeleide kenmerken
//   createdAt: string             // ISO-timestamp, wanneer het profiel is gegenereerd
// }

export type Goal = 'lose' | 'muscle' | 'fit' | 'maintain';
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type ActivityLevel = 'low' | 'med' | 'high';
export type RoutineType = 'strength' | 'cardio' | 'sports' | 'none';

// Eén AI-gegenereerde (rule-based) vervolgvraag + het antwoord van de gebruiker.
// Zie src/services/followUpQuestions.ts voor hoe deze vragen bepaald worden.
export interface FollowUpAnswer {
  id: string;
  question: string;   // de vraagtekst zoals getoond (al vertaald)
  answer: string;      // waarde van de gekozen optie (stabiel, taal-onafhankelijk)
  answerLabel: string; // getoond label van de gekozen optie (al vertaald)
}

// Ruwe antwoorden zoals de multi-step onboarding-flow ze verzamelt.
export interface OnboardingAnswers {
  name: string;
  goal: Goal;
  fitnessLevel: FitnessLevel;
  trainingDaysPerWeek: number;      // 0-7, huidige routine
  routineTypes: RoutineType[];      // welk soort training doet de gebruiker al
  sleepHours: number;               // gemiddeld aantal uur slaap per nacht
  stressLevel: number;              // 1 (laag) - 5 (hoog)
  alcohol: boolean;                 // drinkt regelmatig alcohol
  smoking: boolean;                 // rookt
  currentWeight: number;            // kg
  targetWeight: number;             // kg
  height: number;                   // cm
  age: number;                      // jaar, nodig voor de BMR-berekening (Mifflin-St Jeor)
  activityLevel: ActivityLevel;     // dagelijkse activiteit buiten trainingen
  followUps: FollowUpAnswer[];      // 1-3 gerichte vervolgvragen o.b.v. bovenstaande antwoorden
}

// Afgeleide kenmerken: berekend uit de antwoorden, herbruikbaar door de
// rest van de app (doelen, advies-generator, en later AI-prompts).
export interface DerivedProfile {
  bmi: number;
  bmiCategory: 'ondergewicht' | 'gezond' | 'overgewicht' | 'obesitas';
  calorieTarget: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatsTargetG: number;
  waterTargetL: number;
  sleepTargetHours: number;
  stepGoal: number;
  weightDeltaKg: number;             // targetWeight - currentWeight (negatief = afvallen)
  recommendedTrainingDaysPerWeek: number;
  recoveryRisk: 'low' | 'medium' | 'high'; // op basis van slaap + stress
}

export interface AIProfile {
  version: 1;
  answers: OnboardingAnswers;
  derived: DerivedProfile;
  createdAt: string;
}
