import { supabase } from '../lib/supabase'

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

// Accepts either an email address or a username. Usernames are resolved to an
// email via the `get_email_by_username` RPC before calling signInWithPassword,
// since Supabase Auth itself only authenticates by email.
export const signIn = async (identifier, password) => {
  const isEmail = identifier.includes('@')
  if (isEmail) {
    return supabase.auth.signInWithPassword({ email: identifier, password })
  }

  const { data: email, error: lookupError } = await supabase.rpc('get_email_by_username', {
    p_username: identifier.trim().toLowerCase(),
  })
  if (lookupError || !email) {
    return { error: { message: 'Onbekende gebruikersnaam of e-mail.' } }
  }
  return supabase.auth.signInWithPassword({ email, password })
}

export const signOut = async () => {
  return supabase.auth.signOut()
}
