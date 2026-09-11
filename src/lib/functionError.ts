// src/lib/functionError.ts — leesbare melding uit een mislukte Edge Function-aanroep.
//
// supabase.functions.invoke geeft bij een non-2xx status alleen een generieke
// FunctionsHttpError ("Edge Function returned a non-2xx status code"). De eigen
// melding van de functie ({ error: '...' }) zit in de response body, via error.context.
export async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  try {
    const context = (error as { context?: Response })?.context;
    if (context && typeof context.json === 'function') {
      const body = await context.json();
      if (body && typeof body.error === 'string' && body.error) return body.error;
    }
  } catch {
    // Geen JSON-body (bv. geen netwerk) — dan de fallback.
  }
  return fallback;
}
