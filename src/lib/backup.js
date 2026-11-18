import { CATS } from './defaults';
import { migrate } from './defaults';

/**
 * Sur iPhone, la feuille de partage (Web Share API niveau 2, fichiers) propose « Enregistrer dans Fichiers »,
 * donc iCloud Drive. Ailleurs on retombe sur un téléchargement classique.
 * Doit être appelé directement depuis un geste de l'utilisateur (sinon iOS refuse le partage).
 */
export async function shareOrDownload(filename, text, mime) {
  const file = new File([text], filename, { type: mime });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: filename });
    return 'shared';
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}

export const backupFilename = (ext) => `budget-${new Date().toISOString().slice(0, 10)}.${ext}`;
export const toJSON = (state) => JSON.stringify(state, null, 2);

export function toCSV(state) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const num = (n) => String(n ?? '').replace('.', ',');
  const rows = [['Type', 'Catégorie', 'Libellé', 'Montant', 'Fréquence', 'Mois', 'Jour/Date', 'Note']];
  rows.push(['Revenu', 'Salaire', 'Salaire net', num(state.settings.salary), 'mensuel', '', '', '']);
  for (const i of state.items) {
    rows.push([i.cat === 'revenu' ? 'Revenu prévu' : 'Budget', CATS[i.cat].label, i.name, num(i.amount), i.rec, i.month || '', i.day || '', '']);
  }
  const names = new Map(state.items.map((i) => [i.id, i]));
  for (const e of [...state.expenses].sort((a, b) => a.date.localeCompare(b.date))) {
    const it = names.get(e.itemId);
    rows.push(['Dépense réelle', it ? CATS[it.cat].label : CATS.autre.label, it?.name || 'Hors budget', num(e.amount), '', e.date.slice(0, 7), e.date, e.note || '']);
  }
  for (const [k, m] of Object.entries(state.months).sort()) {
    rows.push(['Clôture', '', `Mois ${k}`, num(m.saved), '', k, m.closedAt.slice(0, 10), `Revenus ${num(m.income)} / Dépenses ${num(m.spent)}`]);
  }
  for (const a of state.accounts) rows.push(['Compte', a.kind, a.name, num(a.balance), '', state.settings.startMonth, '', `Taux ${num(a.rate)} % · part ${a.share} %`]);
  // BOM UTF-8 pour qu'Excel et Numbers lisent les accents ; séparateur ; pour la locale française.
  return '﻿' + rows.map((r) => r.map(esc).join(';')).join('\n');
}

export function parseBackup(text) {
  const data = JSON.parse(text);
  return migrate(data);
}
