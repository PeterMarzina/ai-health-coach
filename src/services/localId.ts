// src/services/localId.ts — client-side UUID's voor crash-safe sync (Deel A1)
// Sessies/sets krijgen hun id al op het toestel, vóór ze naar Supabase gaan:
// zo kan een insert altijd veilig herhaald worden (upsert op dezelfde id) als
// de app crasht of offline is tussen "lokaal opgeslagen" en "gesynced".
// Geen nieuwe dependency: leunt op de al-aanwezige crypto.getRandomValues
// polyfill (react-native-get-random-values, geïmporteerd door src/lib/supabase.js).

export function uuidv4(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // versie 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
