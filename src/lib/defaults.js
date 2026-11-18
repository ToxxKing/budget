import { dayKeyOf } from './dates';

export const SCHEMA_VERSION = 2;

/** Taux réglementé utilisé par le compte prédéfini « Livret A » (en vigueur du 1er août 2026 au 31 janvier 2027). */
export const LIVRET_A_RATE = 1.7;

export const CATS = {
  fixe: { label: 'Charges fixes', short: 'Fixes', color: '#8fa8ff' },
  vie: { label: 'Vie courante', short: 'Vie courante', color: '#4ade80' },
  shopping: { label: 'Shopping', short: 'Shopping', color: '#f0abfc' },
  dette: { label: 'Dettes ponctuelles', short: 'Dettes', color: '#fbbf24' },
  revenu: { label: 'Revenus annexes', short: 'Revenus', color: '#5eead4' },
  autre: { label: 'Hors budget', short: 'Hors budget', color: '#fb923c' },
};
export const CAT_ORDER = ['fixe', 'vie', 'shopping', 'dette', 'revenu'];
export const SPEND_CATS = ['fixe', 'vie', 'shopping', 'dette', 'autre'];

export const defaultState = () => ({
  version: SCHEMA_VERSION,
  settings: { salary: 2000, startMonth: '2026-11', remindDays: 7 },
  accounts: [{ id: 'epargne', name: 'Épargne', kind: 'epargne', balance: 900, rate: 0, share: 100 }],
  items: [
    { id: 'maman', name: 'Participation maman', amount: 200, cat: 'fixe', rec: 'mensuel', day: null },
    { id: 'ugc', name: 'UGC Illimité', amount: 25, cat: 'fixe', rec: 'mensuel', day: null },
    { id: 'canal', name: 'Canal+', amount: 16, cat: 'fixe', rec: 'mensuel', day: null },
    { id: 'bouygues', name: 'Bouygues Telecom', amount: 10, cat: 'fixe', rec: 'mensuel', day: null },
    { id: 'coiffeur', name: 'Coiffeur', amount: 25, cat: 'fixe', rec: 'mensuel', day: null },
    { id: 'sorties', name: 'Sorties & Restaurants', amount: 150, cat: 'vie', rec: 'mensuel', rollover: 'save' },
    { id: 'courses', name: 'Courses & Repas extérieurs', amount: 100, cat: 'vie', rec: 'mensuel', rollover: 'save' },
    { id: 'shopping', name: 'Shopping & Vêtements', amount: 130, cat: 'shopping', rec: 'mensuel', rollover: 'save' },
    { id: 'hadrien', name: 'Remboursement Hadrien', amount: 300, cat: 'dette', rec: 'ponctuel', month: '2026-11', day: null },
    { id: 'nordine', name: 'Remboursement Nordine', amount: 100, cat: 'dette', rec: 'ponctuel', month: '2026-11', day: null },
    { id: 'klarna', name: 'Klarna', amount: 60, cat: 'dette', rec: 'ponctuel', month: '2026-11', day: null },
    { id: 'ugc-retard', name: 'Régularisation retard UGC', amount: 25, cat: 'dette', rec: 'ponctuel', month: '2026-11', day: null },
    { id: 'canal-retard', name: 'Régularisation retard Canal+', amount: 16, cat: 'dette', rec: 'ponctuel', month: '2026-11', day: null },
    { id: 'site-1', name: 'Site internet — tranche 1', amount: 300, cat: 'revenu', rec: 'ponctuel', month: '2026-12', day: null },
    { id: 'site-2', name: 'Site internet — tranche 2', amount: 300, cat: 'revenu', rec: 'ponctuel', month: '2027-01', day: null },
  ],
  expenses: [],
  paid: {},
  months: {},
  pots: [
    { id: 'matelas', name: 'Matelas de sécurité', pct: 40, target: 3000, deadline: null, initial: 0 },
    { id: 'voyage', name: 'Voyage', pct: 30, target: 1500, deadline: null, initial: 0 },
    { id: 'voiture', name: 'Voiture', pct: 20, target: 6000, deadline: null, initial: 0 },
  ],
  meta: { updatedAt: null, lastBackupAt: null, installHintDismissed: false },
});

/** Accepte une sauvegarde v1 (artifact claude.ai) ou v2 et renvoie un état v2 complet. */
export function migrate(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.items) || !input.settings) {
    throw new Error('invalid');
  }
  const base = defaultState();
  const s = JSON.parse(JSON.stringify(input));

  if (!s.version || s.version < 2) {
    const startSavings = Number(s.settings.startSavings ?? 0);
    s.accounts = [{ id: 'epargne', name: 'Épargne', kind: 'epargne', balance: startSavings, rate: 0, share: 100 }];
    delete s.settings.startSavings;
    s.items = s.items.map((it) => ({
      ...it,
      day: it.day ?? null,
      ...(it.cat === 'vie' || it.cat === 'shopping' ? { rollover: it.rollover || 'save' } : {}),
    }));
    s.expenses = (s.expenses || []).map((e) => ({
      id: e.id,
      itemId: e.itemId ?? e.envId ?? null,
      amount: Number(e.amount) || 0,
      note: e.note || '',
      date: e.date && e.date.length > 10 ? dayKeyOf(new Date(e.date)) : e.date,
    }));
    const paid = {};
    for (const [k, v] of Object.entries(s.paid || {})) {
      const id = k.split(':')[1];
      const it = s.items.find((x) => x.id === id);
      paid[k] = { at: typeof v === 'string' ? v : new Date().toISOString(), amount: it ? it.amount : 0 };
    }
    s.paid = paid;
    s.pots = (s.pots || []).map((p) => ({ deadline: null, initial: 0, ...p }));
    s.months = {};
    s.version = SCHEMA_VERSION;
  }

  return {
    ...base,
    ...s,
    settings: { ...base.settings, ...s.settings },
    accounts: s.accounts?.length ? s.accounts : base.accounts,
    meta: { ...base.meta, ...(s.meta || {}) },
    months: s.months || {},
    paid: s.paid || {},
    expenses: s.expenses || [],
    pots: s.pots || [],
  };
}
