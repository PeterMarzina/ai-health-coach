// supabase/functions/username-login/index.ts — inloggen met gebruikersnaam (Edge Function, Deno)
//
// Supabase Auth logt alleen in met e-mail. Vroeger zocht de app zelf het e-mailadres
// op via de RPC get_email_by_username — maar die was voor iedereen aanroepbaar, ook
// zonder account. Wie een gebruikersnaam kende of raadde, kreeg zo het e-mailadres
// (security advisor: anon_security_definer_function_executable).
//
// Nu gebeurt de hele login hier, server-side: gebruikersnaam → e-mail (service role)
// → signInWithPassword → alleen de sessie-tokens gaan terug. Het e-mailadres verlaat
// de server nooit, en zonder het juiste wachtwoord krijg je niets.
//
// verify_jwt staat UIT: de aanroeper is per definitie nog niet ingelogd, en de app
// gebruikt een publishable key (geen JWT). De functie beveiligt zichzelf via het
// wachtwoord; brute-force wordt afgeremd door de rate limits van Supabase Auth.
//
// Deploy: supabase functions deploy username-login --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Eén melding voor "naam bestaat niet" én "wachtwoord fout": anders verraadt het
// antwoord welke gebruikersnamen bestaan.
const INVALID_LOGIN = 'Onjuiste gebruikersnaam of wachtwoord.';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Alleen POST' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!username || !password || username.length > 64 || password.length > 256) {
      return json({ error: INVALID_LOGIN }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // get_email_by_username is sinds migratie username_login_hardening alleen nog
    // uitvoerbaar voor service_role.
    const { data: email, error: lookupError } = await admin.rpc('get_email_by_username', {
      p_username: username,
    });
    if (lookupError) {
      console.error('username-login: lookup mislukt', lookupError);
      return json({ error: 'Inloggen mislukt, probeer het later opnieuw.' }, 500);
    }
    if (!email) return json({ error: INVALID_LOGIN }, 401);

    const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error: signInError } = await authClient.auth.signInWithPassword({
      email: email as string,
      password,
    });
    if (signInError || !data.session) {
      if (signInError?.code === 'email_not_confirmed') {
        return json({ error: 'Bevestig eerst je e-mailadres via de link in je mail.' }, 401);
      }
      if (signInError?.status === 429) {
        return json({ error: 'Te veel inlogpogingen, probeer het over een paar minuten opnieuw.' }, 429);
      }
      return json({ error: INVALID_LOGIN }, 401);
    }

    return json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch (e) {
    console.error('username-login: onverwachte fout', e);
    return json({ error: 'Inloggen mislukt, probeer het later opnieuw.' }, 500);
  }
});
