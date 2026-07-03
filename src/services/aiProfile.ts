// src/services/aiProfile.ts — bouwt het "AI profile object" (zie src/types/aiProfile.ts)
// buildAIProfile() neemt de ruwe onboarding-antwoorden en berekent daarbovenop
// een set afgeleide kenmerken (BMI, calorie-/macrodoelen, herstelrisico, ...).
import type { AIProfile, DerivedProfile, OnboardingAnswers } from '@/src/types/aiProfile';

// Standaard TDEE-multipliers (Mifflin-St Jeor) voor onze 3 activiteitsniveaus
// (licht actief / matig actief / actief naast trainingen).
const ACTIVITY_MULTIPLIER: Record<OnboardingAnswers['activityLevel'], number> = {
  low: 1.375,
  med: 1.55,
  high: 1.725,
};

// Grams eiwit per kg lichaamsgewicht, afhankelijk van doel (hoger bij afvallen
// om spiermassa te behouden in een calorietekort, hoger bij spieropbouw).
const PROTEIN_PER_KG: Record<OnboardingAnswers['goal'], number> = {
  lose: 2.2,
  muscle: 2.0,
  fit: 1.8,
  maintain: 1.6,
};

const GOAL_CALORIE_ADJUSTMENT: Record<OnboardingAnswers['goal'], number> = {
  lose: -500,
  muscle: 300,
  fit: 0,
  maintain: 0,
};

// Mifflin-St Jeor BMR: 10*kg + 6.25*cm - 5*leeftijd + geslachtsconstante
// (+5 voor man, -161 voor vrouw). We vragen geen geslacht uit, dus gebruiken
// we het gemiddelde van beide constantes (-78) — niet perfect, maar een
// redelijke schatting zonder een gevoelig veld toe te voegen aan onboarding.
const BMR_SEX_CONSTANT_AVERAGE = -78;

function calcBmr(weightKg: number, heightCm: number, age: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + BMR_SEX_CONSTANT_AVERAGE;
}

function calcBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

function bmiCategory(bmi: number): DerivedProfile['bmiCategory'] {
  if (bmi < 18.5) return 'ondergewicht';
  if (bmi < 25) return 'gezond';
  if (bmi < 30) return 'overgewicht';
  return 'obesitas';
}

function recoveryRisk(sleepHours: number, stressLevel: number): DerivedProfile['recoveryRisk'] {
  // Weinig slaap + hoge stress verhoogt het risico op onvoldoende herstel.
  const score = (sleepHours < 6 ? 2 : sleepHours < 7 ? 1 : 0) + (stressLevel >= 4 ? 2 : stressLevel === 3 ? 1 : 0);
  if (score >= 3) return 'high';
  if (score >= 1) return 'medium';
  return 'low';
}

function recommendedTrainingDays(level: OnboardingAnswers['fitnessLevel'], goal: OnboardingAnswers['goal']): number {
  const base = level === 'beginner' ? 3 : level === 'intermediate' ? 4 : 5;
  return goal === 'maintain' ? Math.max(2, base - 1) : base;
}

export function buildAIProfile(answers: OnboardingAnswers): AIProfile {
  const bmi = calcBmi(answers.currentWeight, answers.height);
  const risk = recoveryRisk(answers.sleepHours, answers.stressLevel);

  const bmr = calcBmr(answers.currentWeight, answers.height, answers.age);
  const tdee = bmr * ACTIVITY_MULTIPLIER[answers.activityLevel];
  const calorieTarget = Math.max(1200, Math.round(tdee + GOAL_CALORIE_ADJUSTMENT[answers.goal]));

  const proteinTargetG = Math.round(answers.currentWeight * PROTEIN_PER_KG[answers.goal]);
  const fatsTargetG = Math.round((calorieTarget * 0.25) / 9);
  const carbsTargetG = Math.max(0, Math.round((calorieTarget - proteinTargetG * 4 - fatsTargetG * 9) / 4));

  const derived: DerivedProfile = {
    bmi,
    bmiCategory: bmiCategory(bmi),
    calorieTarget,
    proteinTargetG,
    carbsTargetG,
    fatsTargetG,
    waterTargetL: Math.round(answers.currentWeight * 0.033 * 10) / 10,
    sleepTargetHours: risk === 'high' ? 8.5 : risk === 'medium' ? 8 : 7.5,
    stepGoal: answers.activityLevel === 'low' ? 6000 : answers.activityLevel === 'med' ? 9000 : 12000,
    weightDeltaKg: Math.round((answers.targetWeight - answers.currentWeight) * 10) / 10,
    recommendedTrainingDaysPerWeek: recommendedTrainingDays(answers.fitnessLevel, answers.goal),
    recoveryRisk: risk,
  };

  return {
    version: 1,
    answers,
    derived,
    createdAt: new Date().toISOString(),
  };
}
