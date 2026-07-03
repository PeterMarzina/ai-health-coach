// supabase/functions/ai-advice/index.ts — Edge Function (Deno)
// Proxy naar de NVIDIA-gehoste (OpenAI-compatible) deepseek-v4-pro chat-completion.
// Draait server-side zodat de NVIDIA API-key nooit in de app-bundle terechtkomt.
// De key wordt gelezen uit een Supabase secret (zie deploy-instructies onderaan).
//
// JWT-verificatie staat standaard aan voor Supabase Edge Functions: alleen
// ingelogde gebruikers (geldige Supabase-sessie) kunnen deze functie aanroepen.

const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'deepseek-ai/deepseek-v4-pro';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      return new Response(JSON.stringify({ error: 'NVIDIA_API_KEY ontbreekt (zet als Supabase secret)' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // De app stuurt de prompt/tekst mee die het model moet verwerken,
    // bv. het AI-profiel of een vraag van de gebruiker.
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Body moet { prompt: string } bevatten' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
      return new Response(JSON.stringify({ error: `NVIDIA API-fout: ${text}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await nvidiaRes.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
