// constants/i18n.ts — alle teksten in het Nederlands (nl) en Engels (en)
// Gebruik via de t()-functie uit useLang(): bv. t('login_title').
// Een nieuwe tekst voeg je toe door in BEIDE talen een regel met dezelfde sleutel te zetten.

export type Lang = 'nl' | 'en';

export const translations = {
  nl: {
    // Login
    login_title: 'Welkom terug',
    signup_title: 'Account aanmaken',
    login_subtitle: 'Log in om verder te gaan.',
    signup_subtitle: 'Maak een account om te starten.',
    email: 'E-mail',
    password: 'Wachtwoord',
    email_ph: 'jij@voorbeeld.nl',
    btn_login: 'Inloggen',
    btn_signup: 'Registreren',
    switch_to_signup: 'Nog geen account? ',
    switch_to_login: 'Al een account? ',
    fill_fields: 'Vul je e-mail en wachtwoord in.',
    err_title: 'Er ging iets mis',
    oops: 'Oeps',
    signup_done_title: 'Gelukt',
    signup_done_msg: 'Account aangemaakt! Controleer eventueel je e-mail.',

    // Onboarding
    ob_title: 'Laten we je leren kennen',
    ob_subtitle: 'Zo stellen we je doelen vast.',
    ob_name_label: 'Wat is je naam?',
    ob_name_ph: 'Je naam',
    ob_goal_label: 'Wat is je hoofddoel?',
    goal_lose: 'Afvallen',
    goal_muscle: 'Spier opbouwen',
    goal_fit: 'Fitter worden',
    goal_maintain: 'Onderhouden',
    ob_curweight: 'Huidig gewicht (kg)',
    ob_targetweight: 'Streefgewicht (kg)',
    ob_activity: 'Activiteitsniveau',
    act_low: 'Laag',
    act_med: 'Gemiddeld',
    act_high: 'Hoog',
    ob_finish: 'Klaar! Start',
    ob_missing: 'Vul alsjeblieft alles in.',

    // Algemeen
    language: 'Taal',
    log_out: 'Uitloggen',
  },
  en: {
    // Login
    login_title: 'Welcome back',
    signup_title: 'Create account',
    login_subtitle: 'Log in to continue.',
    signup_subtitle: 'Create an account to get started.',
    email: 'Email',
    password: 'Password',
    email_ph: 'you@example.com',
    btn_login: 'Log in',
    btn_signup: 'Sign up',
    switch_to_signup: "Don't have an account? ",
    switch_to_login: 'Already have an account? ',
    fill_fields: 'Please enter your email and password.',
    err_title: 'Something went wrong',
    oops: 'Oops',
    signup_done_title: 'Success',
    signup_done_msg: 'Account created! Check your email if needed.',

    // Onboarding
    ob_title: "Let's get to know you",
    ob_subtitle: "This is how we'll set your goals.",
    ob_name_label: "What's your name?",
    ob_name_ph: 'Your name',
    ob_goal_label: "What's your main goal?",
    goal_lose: 'Lose weight',
    goal_muscle: 'Build muscle',
    goal_fit: 'Get fitter',
    goal_maintain: 'Maintain',
    ob_curweight: 'Current weight (kg)',
    ob_targetweight: 'Target weight (kg)',
    ob_activity: 'Activity level',
    act_low: 'Low',
    act_med: 'Medium',
    act_high: 'High',
    ob_finish: 'Finish setup',
    ob_missing: 'Please fill in everything.',

    // General
    language: 'Language',
    log_out: 'Log out',
  },
} as const;

// Alle beschikbare sleutels (zodat t() typeveilig is).
export type TKey = keyof typeof translations['nl'];
