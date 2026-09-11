// app/goals.tsx — Doelen aanpassen
// Invulvelden voor je doelen (calorieën, eiwit, water, ...). Bij opslaan worden ze
// via setGoals() uit useSettings() bewaard, zodat andere schermen de nieuwe waarden zien.
import React from 'react';
import { useLang, useSettings } from '@/components/store';
import { NumberForm, NumberField } from '@/components/NumberForm';
import { DEFAULT_GOALS } from '@/constants/data';

export default function Goals() {
  const { t } = useLang();
  const { goals, setGoals } = useSettings();

  const fields: NumberField<keyof typeof DEFAULT_GOALS>[] = [
    { key: 'calories', label: t('goal_calories_label'), unit: 'kcal', hint: '1200–3000' },
    { key: 'protein', label: t('goal_protein_label'), unit: 'g', hint: '100–200' },
    { key: 'carbs', label: t('goal_carbs_label'), unit: 'g', hint: '150–400' },
    { key: 'fats', label: t('goal_fats_label'), unit: 'g', hint: '50–100' },
    { key: 'water', label: t('goal_water_label'), unit: 'L', hint: '1.5–3.0' },
    { key: 'sleepHours', label: t('goal_sleep_label'), unit: t('hour_short'), hint: '7–9' },
    { key: 'steps', label: t('goal_steps_label'), unit: t('steps_unit'), hint: '5000–15000' },
    { key: 'weightTarget', label: t('goal_weight_label'), unit: 'kg', hint: '70–100' },
  ];

  return <NumberForm title={t('goals')} fields={fields} values={goals} saveLabel={t('goals_save')} onSave={setGoals} />;
}
