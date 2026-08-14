// supabase/functions/ai-advice/index.ts — Edge Function (Deno)
// Proxy naar de NVIDIA-gehoste (OpenAI-compatible) deepseek-v4-pro chat-completion.
// Draait server-side zodat de NVIDIA API-key nooit in de app-bundle terechtkomt.
// De key wordt gelezen uit een Supabase secret (zie deploy-instructies onderaan).
//
// JWT-verificatie staat standaard aan voor Supabase Edge Functions: alleen
// ingelogde gebruikers (geldige Supabase-sessie) kunnen deze functie aanroepen.
//
// Rate limit: per-user teller op `ai_coach_calls` (migratie 015), geschreven met
// de service-role key. Nodig omdat de NVIDIA-key gedeeld is: 'ingelogd' is een
// lage drempel zolang iedereen zich kan registreren, dus zonder teller kan één
// account het quotum van het hele team opmaken. Twee vensters: per minuut tegen
// loops/dubbelklikken, per dag tegen het langzaam opdrijven van de kosten.
//
// Prompt-cap: `max_tokens` begrenst alleen de output; de input was onbegrensd.
// MAX_PROMPT_CHARS zet daar een plafond op (een echt profiel-prompt uit
// src/services/aiAdvice.ts is ~900-1400 tekens, dus ruim voldoende marge).

import { createClient } from 'npm:@supabase/supabase-js@2';

const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'deepseek-ai/deepseek-v4-pro';

const RATE_LIMIT_PER_MINUTE = 10;
const RATE_LIMIT_PER_DAY = 100;
const MAX_PROMPT_CHARS = 8000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Vaste system-prompt: bepaalt rol, grenzen en outputformaat van het model.
// Blijft server-side (de client stuurt alleen profielgegevens/vraag mee) zodat
// gebruikers deze instructies niet kunnen overschrijven of omzeilen.
const SYSTEM_PROMPT = `Je bent de AI-coach in de app "AI Health Coach", een fitness- en voedingsapp.

TAAK
Geef kort, persoonlijk en motiverend advies, uitsluitend gebaseerd op de gebruikersgegevens die je in het bericht krijgt (gelabeld als PROFIEL). Gebruik geen aannames over dingen die niet zijn aangeleverd.

STRIKTE REGELS
1. Gebruik alléén de cijfers/feiten uit PROFIEL. Verzin nooit eigen getallen (kcal, kg, dagen, etc.) — als iets ontbreekt, ga er dan niet expliciet op in.
2. Je bent geen arts, diëtist of fysiotherapeut en geeft geen medische diagnoses of behandeladvies. Bij signalen die op een medisch probleem kunnen wijzen (bv. extreem lage/hoge BMI, zeer weinig slaap gecombineerd met hoge stress) geef je een voorzichtige aanbeveling om een arts/specialist te raadplegen, in plaats van een oplossing te verzinnen.
3. Antwoord in de taal die in PROFIEL of het verzoek staat aangegeven (nl of en). Mix geen talen.
4. Toon: motiverend, direct, geen jargon. Maximaal 100-120 woorden, lopende tekst (geen bullets, geen markdown, geen headers).
5. Verwijs niet naar jezelf als "AI" of "taalmodel" en leg niet uit hoe je tot het advies komt — geef alleen het advies zelf.
6. Als PROFIEL onvoldoende of tegenstrijdige data bevat om een zinnig advies te geven, zeg dat kort en vraag om welke ontbrekende informatie het gaat — verzin niets.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('NVIDIA_API_KEY');
    if (!apiKey) {
      return json({ error: 'NVIDIA_API_KEY ontbreekt (zet als Supabase secret)' }, 500);
    }

    // Wie roept aan? JWT-verificatie staat aan, maar we hebben het user-id zelf
    // nodig om per gebruiker te kunnen tellen.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Geen Authorization header' }, 401);

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) return json({ error: 'Niet ingelogd' }, 401);
    const userId = userData.user.id;

    // De app stuurt de prompt/tekst mee die het model moet verwerken,
    // bv. het AI-profiel of een vraag van de gebruiker.
    const { prompt } = await req.json().catch(() => ({ prompt: undefined }));
    if (!prompt || typeof prompt !== 'string') {
      return json({ error: 'Body moet { prompt: string } bevatten' }, 400);
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
      return json({ error: `Prompt te lang (max ${MAX_PROMPT_CHARS} tekens).` }, 400);
    }

    // Teller met de service-role key: de client mag deze rijen niet schrijven,
    // anders kan hij zijn eigen limiet resetten.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const nowMs = Date.now();
    const [minuteRes, dayRes] = await Promise.all([
      supabaseAdmin
        .from('ai_coach_calls')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('called_at', new Date(nowMs - 60_000).toISOString()),
      supabaseAdmin
        .from('ai_coach_calls')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('called_at', new Date(nowMs - 24 * 60 * 60_000).toISOString()),
    ]);
    if (minuteRes.error) throw minuteRes.error;
    if (dayRes.error) throw dayRes.error;

    if ((minuteRes.count ?? 0) >= RATE_LIMIT_PER_MINUTE) {
      return json({ error: 'Te veel verzoeken, probeer over een minuut opnieuw.' }, 429);
    }
    if ((dayRes.count ?? 0) >= RATE_LIMIT_PER_DAY) {
      return json({ error: 'Daglimiet voor AI-advies bereikt, probeer het morgen opnieuw.' }, 429);
    }

    // Pas tellen vlak vóór de betaalde call, zodat afgekeurde verzoeken
    // (geen prompt, te lang) niet meetellen voor de limiet.
    await supabaseAdmin.from('ai_coach_calls').insert({ user_id: userId });

    const nvidiaRes = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        // Lagere temperature/top_p en een kort max_tokens houden het advies
        // feitelijk en voorkomt dat het model gaat 'freewheelen' of afdwaalt.
        temperature: 0.4,
        top_p: 0.9,
        max_tokens: 400,
        chat_template_kwargs: { thinking: false },
        stream: false,
      }),
    });

    if (!nvidiaRes.ok) {
      const text = await nvidiaRes.text();
      return json({ error: `NVIDIA API-fout: ${text}` }, 502);
    }

    const data = await nvidiaRes.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    return json({ content });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
