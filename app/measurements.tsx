// app/measurements.tsx — Metingen aanpassen
// Invulvelden voor je lichaamsmetingen (gewicht, vetpercentage, ...). Bij opslaan
// gaan ze via setMeasurements() uit useSettings() naar de gedeelde instellingen.
// Lege velden blijven 0 = "niet ingevuld".
import React from 'react';
import { useLang, useSettings } from '@/components/store';
import { NumberForm, NumberField } from '@/components/NumberForm';
import { DEFAULT_MEASUREMENTS } from '@/constants/data';

export default function Measurements() {
  const { t } = useLang();
  const { measurements, setMeasurements } = useSettings();

  const fields: NumberField<keyof typeof DEFAULT_MEASUREMENTS>[] = [
    { key: 'weight', label: t('weight'), unit: 'kg' },
    { key: 'height', label: t('m_height'), unit: 'cm' },
    { key: 'bodyFat', label: t('m_body_fat'), unit: '%' },
    { key: 'chest', label: t('m_chest'), unit: 'cm' },
    { key: 'waist', label: t('m_waist'), unit: 'cm' },
    { key: 'hips', label: t('m_hips'), unit: 'cm' },
    { key: 'arms', label: t('m_arms'), unit: 'cm' },
    { key: 'thighs', label: t('m_thighs'), unit: 'cm' },
  ];

  return <NumberForm title={t('measurements')} fields={fields} values={measurements} saveLabel={t('measurements_save')} onSave={setMeasurements} />;
}
