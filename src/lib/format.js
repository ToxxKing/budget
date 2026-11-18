const cache = {};
function nf(dec) {
  const k = String(dec);
  if (!cache[k]) cache[k] = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: dec === 2 ? 2 : 0, maximumFractionDigits: dec });
  return cache[k];
}
/** Montant en euros : décimales seulement si nécessaires (ou forcées). */
export function eur(n, dec) {
  const v = Number(n) || 0;
  const d = dec ?? (Math.round(v) === v ? 0 : 2);
  return nf(d).format(v);
}
/** "12,5" ou "12.5" ou "1 200" -> 12.5 */
export function parseAmount(s) {
  const v = parseFloat(String(s ?? '').replace(/[\s  ]/g, '').replace(',', '.'));
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
}
export const toInput = (n) => (n == null || n === '' ? '' : String(n).replace('.', ','));
export const round2 = (n) => Math.round(n * 100) / 100;
export const uid = () => Math.random().toString(36).slice(2, 10);
export const pct = (n) => `${Math.round(n)} %`;
