// supabase/functions/product-lookup/index.ts — barcode → product (Edge Function, Deno)
//
// Lookup-keten voor de barcodescanner:
//   1. Eigen `products`-tabel op `barcode` (via de JWT van de aanroeper, dus RLS
//      bepaalt zichtbaarheid — net als in de app: 'reference'/'openfoodfacts' zijn
//      publiek, 'user'-producten alleen voor de eigenaar).
//   2. Geen hit → Open Food Facts. 5s timeout; netwerk-/timeoutfouten worden
//      behandeld als "niet gevonden" (nooit een 500 richting de gebruiker daarvoor).
//   3. OFF-hit → cachen in `products` (source='openfoodfacts') zodat de volgende
//      scan van dezelfde barcode instant/offline-vriendelijk is. Dit gebeurt met de
//      service-role key: de gewone insert-policy staat alleen source='user' toe voor
//      de eigenaar, de gedeelde cache wordt bewust centraal beheerd door deze functie.
//   4. Ontbrekende macro's blijven `null` (nooit 0) — `products.*_per_100g` is
//      hiervoor nullable gemaakt in migratie 009.
//
// Rate limit: simpele per-user teller op `product_lookup_calls` (service-role),
// alleen geteld vóór een echte OFF-call (cache-hits tellen niet mee).
//
// Secrets: OFF_USER_AGENT (optioneel Supabase secret — Open Food Facts vraagt een
// nette User-Agent met contactgegevens; zonder secret valt dit terug op een generieke
// waarde, zet 'm dus voor productiegebruik). SUPABASE_URL/SUPABASE_ANON_KEY/
// SUPABASE_SERVICE_ROLE_KEY worden automatisch geïnjecteerd.
// Deploy: supabase functions deploy product-lookup

import { createClient } from 'npm:@supabase/supabase-js@2';

const OFF_URL = 'https://world.openfoodfacts.org/api/v2/product';
const OFF_FIELDS = 'product_name,brands,nutriments,serving_size,image_front_small_url';
const OFF_TIMEOUT_MS = 5000;
const RATE_LIMIT_PER_MINUTE = 20;

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

interface ProductRow {
  id: string;
  name: string;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fats_per_100g: number | null;
  brand: string | null;
  barcode: string | null;
  source: string;
  image_url: string | null;
}

function toClientProduct(row: ProductRow) {
  return {
    id: row.id,
    name: row.name,
    caloriesPer100g: row.calories_per_100g,
    proteinPer100g: row.protein_per_100g,
    carbsPer100g: row.carbs_per_100g,
    fatsPer100g: row.fats_per_100g,
    brand: row.brand,
    barcode: row.barcode,
    source: row.source,
    imageUrl: row.image_url,
  };
}

// ean13/ean8/upc_a/upc_e zijn allemaal 6-14 cijfers.
function normalizeBarcode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const digits = raw.trim();
  return /^\d{6,14}$/.test(digits) ? digits : null;
}

async function fetchOpenFoodFacts(barcode: string): Promise<any | null> {
  const userAgent = Deno.env.get('OFF_USER_AGENT') || 'AI-Health-Coach/1.0 (Expo app; no contact configured)';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OFF_TIMEOUT_MS);
  try {
    const res = await fetch(`${OFF_URL}/${barcode}.json?fields=${OFF_FIELDS}`, {
      headers: { 'User-Agent': userAgent },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    return data.product;
  } catch {
    return null; // timeout, netwerkfout, ongeldige JSON → behandel als "niet gevonden"
  } finally {
    clearTimeout(timeout);
  }
}

function mapOffProduct(off: any, barcode: string) {
  const n = off.nutriments ?? {};
  const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  return {
    name: (off.product_name || '').trim() || `Product ${barcode}`,
    brand: off.brands ? String(off.brands).split(',')[0].trim() : null,
    caloriesPer100g: num(n['energy-kcal_100g']),
    proteinPer100g: num(n['proteins_100g']),
    carbsPer100g: num(n['carbohydrates_100g']),
    fatsPer100g: num(n['fat_100g']),
    fiberPer100g: num(n['fiber_100g']),
    sugarPer100g: num(n['sugars_100g']),
    saltPer100g: num(n['salt_100g']),
    servingSize: off.serving_size ?? null,
    imageUrl: off.image_front_small_url ?? null,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Alleen POST' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Geen Authorization header' }, 401);

    // Caller-scoped client: leest via RLS van de aanroeper (dus 'reference'/
    // 'openfoodfacts' plus zijn eigen 'user'-producten — net als in de app zelf).
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) return json({ error: 'Niet ingelogd' }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const barcode = normalizeBarcode(body.barcode);
    if (!barcode) return json({ error: 'Ongeldige of ontbrekende barcode' }, 400);

    // Stap 1: eigen cache.
    const { data: cached, error: cacheError } = await supabaseUser
      .from('products')
      .select('id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fats_per_100g, brand, barcode, source, image_url')
      .eq('barcode', barcode)
      .limit(1)
      .maybeSingle();
    if (cacheError) throw cacheError;
    if (cached) {
      return json({ product: toClientProduct(cached as ProductRow), origin: 'cache' });
    }

    // Vanaf hier: een echte externe call, dus rate-limit + service-role client
    // (voor de teller én om straks als 'openfoodfacts' te mogen cachen).
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const since = new Date(Date.now() - 60_000).toISOString();
    const { count, error: rateError } = await supabaseAdmin
      .from('product_lookup_calls')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('called_at', since);
    if (rateError) throw rateError;
    if ((count ?? 0) >= RATE_LIMIT_PER_MINUTE) {
      return json({ error: 'Te veel opzoekingen, probeer over een minuut opnieuw.' }, 429);
    }
    await supabaseAdmin.from('product_lookup_calls').insert({ user_id: userId });

    // Stap 2: Open Food Facts.
    const off = await fetchOpenFoodFacts(barcode);
    if (!off) {
      return json({ product: null, origin: 'not_found' });
    }
    const mapped = mapOffProduct(off, barcode);
    const extra = {
      fiberPer100g: mapped.fiberPer100g,
      sugarPer100g: mapped.sugarPer100g,
      saltPer100g: mapped.saltPer100g,
      servingSize: mapped.servingSize,
    };

    // Stap 3: cachen voor de volgende scan (best-effort: als de insert faalt —
    // bv. een raceconditie met iemand anders die dezelfde barcode tegelijk scant
    // en de unique index raakt — geeft de gebruiker de opgehaalde data toch terug).
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('products')
      .insert({
        name: mapped.name,
        brand: mapped.brand,
        barcode,
        source: 'openfoodfacts',
        calories_per_100g: mapped.caloriesPer100g,
        protein_per_100g: mapped.proteinPer100g,
        carbs_per_100g: mapped.carbsPer100g,
        fats_per_100g: mapped.fatsPer100g,
        image_url: mapped.imageUrl,
        fetched_at: new Date().toISOString(),
      })
      .select('id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fats_per_100g, brand, barcode, source, image_url')
      .single();

    if (insertError || !inserted) {
      return json({
        product: {
          id: null, name: mapped.name, caloriesPer100g: mapped.caloriesPer100g,
          proteinPer100g: mapped.proteinPer100g, carbsPer100g: mapped.carbsPer100g,
          fatsPer100g: mapped.fatsPer100g, brand: mapped.brand, barcode, source: 'openfoodfacts',
          imageUrl: mapped.imageUrl,
        },
        extra,
        origin: 'openfoodfacts',
      });
    }

    return json({ product: toClientProduct(inserted as ProductRow), extra, origin: 'openfoodfacts' });
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});
