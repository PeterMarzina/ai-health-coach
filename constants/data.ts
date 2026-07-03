// constants/data.ts — alle voorbeeld-data (mock, vast ingetypt)
// Hier staan de getallen die de schermen tonen: score, stats, weekdagen, habits, enz.
// Dit is NEP-data om het ontwerp te laten zien. Later vervang je dit door echte
// gegevens (bv. uit Supabase). DATA = algemene data, CONSUMED = vandaag gegeten.
export const DATA = {
  user: { name: 'Jay', email: 'jay@example.com' },
  score: 87,
  weekDays: [
    { d: 'Mon', n: 20, done: true }, { d: 'Tue', n: 21, today: true }, { d: 'Wed', n: 22 },
    { d: 'Thu', n: 23 }, { d: 'Fri', n: 24 }, { d: 'Sat', n: 25 }, { d: 'Sun', n: 26 },
  ] as { d: string; n: number; done?: boolean; today?: boolean }[],
  stats: [
    { key: 'steps',    label: 'Steps',    value: '8,742', goal: '/10,000', icon: 'footsteps', hue: 'accent',   spark: [4,5,4,6,7,6,8,7,9,8] },
    { key: 'calories', label: 'Calories', value: '2,104', goal: '/2,400',  icon: 'flame',     hue: 'calories', spark: [6,5,7,6,8,7,6,8,7,9] },
    { key: 'protein',  label: 'Protein',  value: '142',   goal: '/160g',   icon: 'target',    hue: 'protein',  spark: [3,5,4,6,5,7,6,8,7,9] },
    { key: 'sleep',    label: 'Sleep',    value: '7h 23m',goal: 'Good',    icon: 'moon',      hue: 'sleep',    spark: [5,6,4,7,5,8,6,7,8,7] },
  ] as { key: string; label: string; value: string; goal: string; icon: string; hue: string; spark: number[] }[],
  workout: {
    name: 'Lower Body Strength', mins: 45, count: 6,
    subtitle: 'Build strength and power in your lower body.',
    exercises: [
      { n: 'Back Squat',        sets: '4 sets · 6–8 reps',            done: true },
      { n: 'Romanian Deadlift', sets: '4 sets · 8–10 reps',           done: true },
      { n: 'Leg Press',         sets: '3 sets · 10–12 reps',          done: false },
      { n: 'Walking Lunge',     sets: '3 sets · 12–15 reps each leg',  done: false },
      { n: 'Leg Curl',          sets: '3 sets · 12–15 reps',          done: false },
      { n: 'Calf Raise',        sets: '4 sets · 15–20 reps',          done: false },
    ],
  },
  habits: [
    { name: '10,000 Steps', detail: '8,742 / 10,000', icon: 'footsteps', done: true },
    { name: 'No Alcohol',   detail: '0 / 1',           icon: 'leaf',      done: false },
    { name: 'Meditation',   detail: '10 / 10 min',     icon: 'sparkle',   done: true },
  ],
  weight: {
    deltaWk: -0.6, deltaMo: -0.6,
    seriesMonth: [80.1, 79.9, 80.0, 79.6, 79.4, 79.5, 79.1, 78.9, 78.7, 78.8, 78.6, 78.4],
    labelsMonth: ['Apr 21', 'Apr 28', 'May 5', 'May 12', 'May 19'],
    sparkWeek: [79.0, 78.9, 79.1, 78.7, 78.6, 78.5, 78.4],
  },
  body: [
    { label: 'Lean Mass', kg: 61.2, pct: 72, hue: 'accent' },
    { label: 'Fat Mass',  kg: 14.8, pct: 18, hue: 'fats' },
    { label: 'Water',     kg: 9.1,  pct: 10, hue: 'water' },
  ],
  strength: { name: 'Back Squat', rm: 100, delta: 5, series: [88, 90, 92, 91, 94, 96, 95, 98, 100] },
  profile: {
    stats: [
      { label: 'Workouts', value: '128', sub: 'Total' },
      { label: 'Current Streak', value: '12', sub: 'Days' },
      { label: 'Avg. Score', value: '82', sub: 'This month' },
    ],
  },
};

// default editable goals & measurements (seed values for SettingsContext)
export const DEFAULT_GOALS = {
  calories: 2400,
  protein: 160,
  carbs: 300,
  fats: 80,
  water: 2.5,   // litres
  sleepHours: 8,
  steps: 10000,
  weightTarget: 75,
};

export const DEFAULT_MEASUREMENTS = {
  weight: 78.4,    // kg
  height: 180,     // cm
  bodyFat: 18,     // %
  chest: 102,      // cm
  waist: 82,       // cm
  hips: 98,        // cm
  arms: 38,        // cm
  thighs: 58,      // cm
};

// "consumed today" — stays fixed; goals are what the user can edit
export const CONSUMED = { calories: 2104, protein: 142, water: 1.6, steps: 8742 };
