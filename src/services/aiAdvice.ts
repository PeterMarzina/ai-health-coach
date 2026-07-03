// src/services/aiAdvice.ts — roept de Supabase Edge Function 'ai-advice' aan.
// Vervangt/vult het rule-based advies (adviceGenerator.ts) aan met een echt
// AI-gegenereerd antwoord, gebaseerd op het AI-profiel object.
//
// De prompt geeft elk veld gelabeld en op een eigen regel mee (i.p.v. ruwe
// JSON) — dat is voor het taalmodel minder foutgevoelig om te lezen dan zelf
// JSON te moeten parsen, en laat geen ruimte voor het verzinnen van velden
// die niet zijn aangeleverd.
import { supabase } from '../lib/supabase';
import type { AIProfile } from '@/src/types/aiProfile';
import type { Lang } from '@/constants/i18n';

function buildPrompt(profile: AIProfile, lang: Lang): string {
  const { answers: a, derived: d } = profile;
  const langLabel = lang === 'nl' ? 'Nederlands' : 'English';

  return `TAAL VOOR ANTWOORD: ${langLabel}

PROFIEL:
- naam: ${a.name}
- hoofddoel: ${a.goal}
- fitness-niveau: ${a.fitnessLevel}
- huidige trainingsdagen per week: ${a.trainingDaysPerWeek}
- type training: ${a.routineTypes.join(', ') || 'geen'}
- gemiddelde slaap per nacht (uur): ${a.sleepHours}
- stressniveau (1=laag, 5=hoog): ${a.stressLevel}
- drinkt alcohol: ${a.alcohol ? 'ja' : 'nee'}
- rookt: ${a.smoking ? 'ja' : 'nee'}
- huidig gewicht (kg): ${a.currentWeight}
- streefgewicht (kg): ${a.targetWeight}
- lengte (cm): ${a.height}
- dagelijks activiteitsniveau: ${a.activityLevel}
${a.followUps.length ? `\nVERVOLGVRAGEN (op maat gesteld o.b.v. bovenstaand profiel):\n${a.followUps.map((f) => `- ${f.question} → ${f.answerLabel}`).join('\n')}\n` : ''}
AFGELEIDE KENMERKEN (al berekend, gebruik deze cijfers exact — reken niet zelf opnieuw):
- BMI: ${d.bmi} (${d.bmiCategory})
- calorie-doel per dag: ${d.calorieTarget} kcal
- eiwit-doel per dag: ${d.proteinTargetG} g
- stappen-doel per dag: ${d.stepGoal}
- gewichtsverschil naar streefgewicht (kg): ${d.weightDeltaKg}
- aanbevolen trainingsdagen per week: ${d.recommendedTrainingDaysPerWeek}
- herstelrisico: ${d.recoveryRisk}

Geef advies op basis van bovenstaand PROFIEL, volgens de regels uit je system-instructies.`;
}

export async function getAIAdvice(profile: AIProfile, lang: Lang = 'nl'): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ai-coach', {
    body: { prompt: buildPrompt(profile, lang) },
  });
  if (error) throw error;
  return data.content as string;
}
