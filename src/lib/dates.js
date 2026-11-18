// Helpers de dates en heure locale. Les mois sont des clés 'YYYY-MM', les jours des clés 'YYYY-MM-DD'.
export const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
export const MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const pad = (n) => String(n).padStart(2, '0');
const split = (key) => key.split('-').map(Number);

export const monthKeyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export const dayKeyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = (now = new Date()) => monthKeyOf(now);
export const todayDayKey = (now = new Date()) => dayKeyOf(now);

export function addMonths(key, n) {
  const [y, m] = split(key);
  return monthKeyOf(new Date(y, m - 1 + n, 1));
}
export function monthDiff(a, b) {
  const [ya, ma] = split(a);
  const [yb, mb] = split(b);
  return (yb - ya) * 12 + (mb - ma);
}
export function daysInMonth(key) {
  const [y, m] = split(key);
  return new Date(y, m, 0).getDate();
}
export const monthLabel = (key) => { const [y, m] = split(key); return `${MOIS[m - 1]} ${y}`; };
export const monthShort = (key) => { const [y, m] = split(key); return `${MOIS_C[m - 1]} ${String(y).slice(2)}`; };
export const monthName = (key) => MOIS[split(key)[1] - 1];

export const clampKey = (key, min, max) => (key < min ? min : key > max ? max : key);
export const monthRange = (from, count) => Array.from({ length: count }, (_, i) => addMonths(from, i));

export function formatDay(dayKey, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  const [y, m, d] = split(dayKey);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', opts);
}
export function daysBetween(fromDate, toDate) {
  const a = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const b = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  return Math.round((b - a) / 86400000);
}
