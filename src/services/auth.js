import { supabase } from '../lib/supabase'
import { functionErrorMessage } from '../lib/functionError'

// Username is stored on the auth user's metadata at signup time (no session
// exists yet if email confirmation is required, so it can't be written to the
// RLS-protected `profiles` table until the user's first login/onboarding).
export const signUp = async (email, password, username) => {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { username: username.trim().toLowerCase() } },
  })
}

// Accepts either an email address or a username. Supabase Auth only authenticates
// by email, so a username login runs server-side in the `username-login` Edge
// Function: it resolves the email, signs in and returns only the session tokens.
// The client never sees the email (the old public RPC leaked it to anyone).
export const signIn = async (identifier, password) => {
  const isEmail = identifier.includes('@')
  if (isEmail) {
    return supabase.auth.signInWithPassword({ email: identifier, password })
  }

  const { data, error } = await supabase.functions.invoke('username-login', {
    body: { username: identifier.trim().toLowerCase(), password },
  })
  if (error) {
    const message = await functionErrorMessage(error, 'Inloggen mislukt, probeer het later opnieuw.')
    return { error: { message } }
  }
  return supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  })
}

export const signOut = async () => {
  return supabase.auth.signOut()
}
