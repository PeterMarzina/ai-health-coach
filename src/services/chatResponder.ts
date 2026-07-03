// src/services/chatResponder.ts — rule-based antwoorden voor de AI-coach chat.
// Matcht trefwoorden in het bericht van de gebruiker en beantwoordt op basis
// van het AI profile object (src/types/aiProfile.ts). Nog geen externe AI-API —
// dat kan later 1-op-1 vervangen worden door bv. getAIAdvice() (aiAdvice.ts)
// zonder de chat-UI zelf aan te passen.
import type { AIProfile } from '@/src/types/aiProfile';
import type { Lang } from '@/constants/i18n';
import { generateAdvice } from './adviceGenerator';

export function generateChatReply(message: string, profile: AIProfile | null, lang: Lang): string {
  if (!profile) {
    return lang === 'nl'
      ? 'Rond eerst de onboarding af, dan kan ik je gerichter helpen.'
      : "Finish onboarding first, then I can help you more specifically.";
  }

  const m = message.toLowerCase();
  const { derived } = profile;

  if (/(voeding|eten|calor|eiwit|protein|nutrition|food|diet)/.test(m)) {
    return lang === 'nl'
      ? `Mik op ~${derived.calorieTarget} kcal en ${derived.proteinTargetG}g eiwit per dag — dat past bij jouw doel.`
      : `Aim for ~${derived.calorieTarget} kcal and ${derived.proteinTargetG}g protein per day — that fits your goal.`;
  }

  if (/(slaap|rust|herstel|sleep|recovery|rest)/.test(m)) {
    const risk = derived.recoveryRisk;
    return lang === 'nl'
      ? `Je herstelrisico is "${risk}". ${risk === 'high' ? 'Bouw extra rustdagen in en probeer eerder te slapen.' : risk === 'medium' ? 'Iets meer slaap of ontspanning kan al veel schelen.' : 'Blijf zo doorgaan, dit ziet er goed uit.'}`
      : `Your recovery risk is "${risk}". ${risk === 'high' ? 'Add extra rest days and try sleeping earlier.' : risk === 'medium' ? 'A bit more sleep or relaxation can make a real difference.' : "Keep it up, this looks good."}`;
  }

  if (/(train|workout|sport|gym|oefening|exercise|routine)/.test(m)) {
    return lang === 'nl'
      ? `Voor jouw niveau (${profile.answers.fitnessLevel}) raden we ${derived.recommendedTrainingDaysPerWeek}x trainen per week aan. Jij traint nu ${profile.answers.trainingDaysPerWeek}x.`
      : `For your level (${profile.answers.fitnessLevel}) we recommend training ${derived.recommendedTrainingDaysPerWeek}x per week. You currently train ${profile.answers.trainingDaysPerWeek}x.`;
  }

  if (/(gewicht|weight|bmi|kilo|kg)/.test(m)) {
    const delta = Math.abs(derived.weightDeltaKg);
    return lang === 'nl'
      ? `Je BMI is ${derived.bmi} (${derived.bmiCategory}). Je streefgewicht ligt ${delta}kg ${derived.weightDeltaKg < 0 ? 'lager' : 'hoger'} dan je huidige gewicht.`
      : `Your BMI is ${derived.bmi} (${derived.bmiCategory}). Your target weight is ${delta}kg ${derived.weightDeltaKg < 0 ? 'lower' : 'higher'} than your current weight.`;
  }

  // Fallback: het algemene rule-based advies uit het AI-profiel.
  return generateAdvice(profile, lang).body;
}
