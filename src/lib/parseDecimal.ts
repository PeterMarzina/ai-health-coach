// src/lib/parseDecimal.ts — getal uit een invulveld.
// "78,5" → 78.5; leeg, onzin of ≤ 0 → 0 (0 betekent in de app "niet ingevuld").
export function parseDecimal(text: string): number {
  const value = parseFloat(text.replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : 0;
}
