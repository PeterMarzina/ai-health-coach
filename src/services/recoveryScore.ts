// src/services/recoveryScore.ts — Recovery Score v1 (rule-based, geen AI)
// Combineert drie handmatig ingevoerde signalen tot één score (0-100):
//   - slaap (uren + kwaliteit)              → hoe goed heb je hersteld vannacht
//   - trainingsbelasting (1-5, zelf-gerapporteerd) → hoe zwaar was je training recent
//   - rustpols (optioneel, "indien beschikbaar") → vergeleken met je eigen gemiddelde
// Niet perfect/klinisch — een eerste, uitlegbare benadering die met echte
// wearable-data (HR/HRV) in een latere sprint verfijnd kan worden.
export type RecoveryLabel = 'low' | 'medium' | 'high';

export interface RecoveryInputs {
  sleepHours: number;
  sleepQuality: number;          // 1-5
  trainingLoad: number;          // 1 (licht) - 5 (zeer zwaar)
  restingHeartRate?: number | null;       // van vandaag, optioneel
  restingHeartRateBaseline?: number | null; // gemiddelde van de laatste dagen, optioneel
  sleepTargetHours?: number;     // persoonlijk slaapdoel uit het AI-profiel; standaard 8
}

export interface RecoveryResult {
  score: number;      // 0-100
  label: RecoveryLabel;
}

const DEFAULT_SLEEP_TARGET_HOURS = 8;

export function recoveryLabel(score: number): RecoveryLabel {
  return score >= 75 ? 'high' : score >= 45 ? 'medium' : 'low';
}

export function computeRecoveryScore(inputs: RecoveryInputs): RecoveryResult {
  const target = inputs.sleepTargetHours && inputs.sleepTargetHours > 0 ? inputs.sleepTargetHours : DEFAULT_SLEEP_TARGET_HOURS;
  const hoursScore = Math.min(inputs.sleepHours / target, 1) * 25;
  const qualityScore = (inputs.sleepQuality / 5) * 25;
  const sleepScore = hoursScore + qualityScore; // 0-50

  // Hoge zelf-gerapporteerde belasting duidt op meer vermoeidheid → lager herstel.
  const loadScore = (1 - (inputs.trainingLoad - 1) / 4) * 30; // 0-30

  const hasHr = inputs.restingHeartRate != null && inputs.restingHeartRateBaseline != null;
  let hrScore = 0;
  if (hasHr) {
    const diff = inputs.restingHeartRate! - inputs.restingHeartRateBaseline!;
    hrScore = diff <= -3 ? 20 : diff <= 3 ? 12 : 0; // lager dan gebruikelijk = beter hersteld
  }

  const rawTotal = hasHr ? sleepScore + loadScore + hrScore : sleepScore + loadScore;
  const maxPossible = hasHr ? 100 : 80;
  const score = Math.round((rawTotal / maxPossible) * 100);

  return { score, label: recoveryLabel(score) };
}
