/**
 * Moteur de calcul : fonctions pures, sans React, testées avec Vitest.
 *
 * Vocabulaire
 *  - prévu (plan)   : ce que le budget annonce pour un mois.
 *  - réel (actual)  : ce qui a été dépensé / coché pour ce mois.
 *  - clôture        : photo figée du mois (state.months[key]) qui sert de vérité pour l'historique,
 *                     le capital réel et les reports d'enveloppes.
 *  - épargné (saved): revenu + report entrant positif − dépenses − report sortant positif.
 *                     Un report positif est de l'argent gardé de côté pour le mois suivant, donc pas épargné.
 */
import { addMonths, daysInMonth, monthDiff, monthKeyOf, todayKey, daysBetween } from './dates';
import { round2 } from './format';

const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const emptyCats = () => ({ fixe: 0, vie: 0, shopping: 0, dette: 0, autre: 0 });

export const isEnvelope = (it) => it?.cat === 'vie' || it?.cat === 'shopping';
export const itemApplies = (it, key, includePonctuel = true) =>
  it.rec === 'mensuel' || (includePonctuel && it.rec === 'ponctuel' && it.month === key);
export const paidKey = (key, id) => `${key}:${id}`;

export function carryIn(state, key, itemId) {
  return state.months?.[addMonths(key, -1)]?.carry?.[itemId] ?? 0;
}

/* ---------- Prévu ---------- */
export function planMonth(state, key, { includePonctuel = true, withCarry = true, sim = null } = {}) {
  const byCat = emptyCats();
  let income = state.settings.salary;
  const lines = [];
  const envelopes = [];
  const incomes = [];
  let carryPos = 0;

  for (const it of state.items) {
    if (!itemApplies(it, key, includePonctuel)) continue;
    if (it.cat === 'revenu') { income += it.amount; incomes.push(it); continue; }
    let amount = it.amount;
    if (isEnvelope(it)) {
      const c = withCarry ? carryIn(state, key, it.id) : 0;
      amount = Math.max(0, it.amount + c);
      carryPos += Math.max(0, c);
      envelopes.push({ item: it, budget: amount, carry: c });
    } else {
      lines.push(it);
    }
    byCat[it.cat] += amount;
  }
  if (sim) {
    byCat.vie += sim.sorties || 0;
    byCat.fixe += sim.charge || 0;
    income += sim.income || 0;
  }
  const expenses = sum(byCat);
  return { key, income, byCat, expenses, lines, envelopes, incomes, carryIn: carryPos, saved: income + carryPos - expenses };
}

/** Mois type : uniquement le récurrent, sans report. */
export const standardMonth = (state) => planMonth(state, addMonths(state.settings.startMonth, 1), { includePonctuel: false, withCarry: false });

/* ---------- Réel ---------- */
export function expensesOf(state, key, itemId) {
  return state.expenses.filter((e) => e.date.slice(0, 7) === key && (itemId === undefined || e.itemId === itemId));
}

export function actualMonth(state, key) {
  const byCat = emptyCats();
  let income = state.settings.salary;
  const ids = new Map(state.items.map((i) => [i.id, i]));
  for (const e of expensesOf(state, key)) {
    const it = ids.get(e.itemId);
    const cat = it && it.cat !== 'revenu' ? it.cat : 'autre';
    byCat[cat] += e.amount;
  }
  for (const it of state.items) {
    if (!itemApplies(it, key) || isEnvelope(it)) continue;
    const p = state.paid[paidKey(key, it.id)];
    if (!p) continue;
    if (it.cat === 'revenu') income += p.amount;
    else byCat[it.cat] += p.amount;
  }
  return { key, income, byCat, spent: sum(byCat) };
}

/**
 * Prévision du mois en cours, corrigée par le réel :
 * lignes payées au montant réel, non payées au montant prévu,
 * enveloppes au maximum entre budget et dépensé, hors-budget en plus.
 * Les revenus annexes sont comptés comme prévus.
 */
export function forecastMonth(state, key) {
  const snap = state.months[key];
  if (snap) return { income: snap.income, spent: snap.spent, saved: snap.saved, committed: snap.spent, closed: true };
  const plan = planMonth(state, key);
  const act = actualMonth(state, key);
  let committed = 0;
  for (const l of plan.lines) {
    const p = state.paid[paidKey(key, l.id)];
    committed += p ? p.amount : l.amount;
  }
  for (const env of plan.envelopes) {
    const spent = expensesOf(state, key, env.item.id).reduce((a, e) => a + e.amount, 0);
    committed += Math.max(env.budget, spent);
  }
  committed += act.byCat.autre;
  const income = plan.income;
  return { income, spent: act.spent, committed, saved: income + plan.carryIn - committed, closed: false, plan, act };
}

/* ---------- Clôture ---------- */
export function firstOpenMonth(state) {
  let k = state.settings.startMonth;
  let guard = 0;
  while (state.months[k] && guard++ < 600) k = addMonths(k, 1);
  return k;
}
export function lastClosedMonth(state) {
  const open = firstOpenMonth(state);
  return open === state.settings.startMonth ? null : addMonths(open, -1);
}
export const canClose = (state, key, now = new Date()) => key === firstOpenMonth(state) && key <= todayKey(now);

export function buildClosing(state, key, { assumeUnpaid = true } = {}) {
  const plan = planMonth(state, key);
  const act = actualMonth(state, key);
  const byCat = { ...act.byCat };
  const assumed = [];
  if (assumeUnpaid) {
    for (const l of plan.lines) {
      if (!state.paid[paidKey(key, l.id)]) { byCat[l.cat] += l.amount; assumed.push(l.id); }
    }
  }
  const missingIncomes = plan.incomes.filter((i) => !state.paid[paidKey(key, i.id)]).map((i) => i.id);
  const carry = {};
  const envelopes = [];
  let carryOut = 0;
  for (const env of plan.envelopes) {
    const spent = round2(expensesOf(state, key, env.item.id).reduce((a, e) => a + e.amount, 0));
    const unspent = round2(env.budget - spent);
    if (env.item.rollover === 'next') { carry[env.item.id] = unspent; carryOut += Math.max(0, unspent); }
    envelopes.push({ id: env.item.id, budget: env.budget, spent, unspent, rollover: env.item.rollover || 'save' });
  }
  const spent = round2(sum(byCat));
  const saved = round2(act.income + plan.carryIn - spent - carryOut);
  return {
    closedAt: new Date().toISOString(),
    income: act.income,
    byCat,
    spent,
    saved,
    carry,
    carryOut: round2(carryOut),
    envelopes,
    assumed,
    missingIncomes,
    planned: { income: plan.income, byCat: plan.byCat, expenses: plan.expenses, saved: round2(plan.saved) },
  };
}

/* ---------- Comptes & projection ---------- */
export function shares(accounts) {
  const total = accounts.reduce((a, x) => a + (Number(x.share) || 0), 0);
  return accounts.map((x, i) => (total > 0 ? (Number(x.share) || 0) / total : i === 0 ? 1 : 0));
}
const startBalances = (state) => state.accounts.map((a) => Number(a.balance) || 0);

/** Une ligne par mois depuis le mois de départ. Mois clôturés = réel, autres = prévu (+ simulation). */
export function project(state, months, sim = null) {
  const accts = state.accounts;
  const sh = shares(accts);
  let bal = startBalances(state);
  const out = [];
  for (let i = 0; i < months; i++) {
    const key = addMonths(state.settings.startMonth, i);
    const snap = state.months[key];
    const saved = snap ? snap.saved : planMonth(state, key, { sim }).saved;
    const interest = bal.map((b, j) => (b > 0 ? b * ((Number(accts[j].rate) || 0) / 100 / 12) : 0));
    bal = bal.map((b, j) => b + interest[j] + saved * sh[j]);
    out.push({ key, capital: round2(bal.reduce((a, b) => a + b, 0)), saved, interest: round2(interest.reduce((a, b) => a + b, 0)), closed: !!snap, balances: bal.map(round2) });
  }
  return out;
}

/** Soldes réels après le dernier mois clôturé. */
export function currentBalances(state) {
  const n = monthDiff(state.settings.startMonth, firstOpenMonth(state));
  if (n <= 0) return startBalances(state);
  return project(state, n)[n - 1].balances;
}
export const currentCapital = (state) => round2(currentBalances(state).reduce((a, b) => a + b, 0));

export function reachDate(state, target, sim = null) {
  if (currentCapital(state) >= target) return { reached: true, key: null };
  const p = project(state, 360, sim);
  const hit = p.find((x) => x.capital >= target);
  return { reached: false, key: hit ? hit.key : null };
}

/* ---------- Cagnottes & objectif inversé ---------- */
export function potValue(state, pot) {
  let v = Number(pot.initial) || 0;
  for (const snap of Object.values(state.months)) v += (snap.saved * (pot.pct || 0)) / 100;
  return Math.max(0, round2(v));
}
export const potMonthly = (state, pot) => round2((standardMonth(state).saved * (pot.pct || 0)) / 100);

export function goalPlan(state, { target, deadline, have = 0 }) {
  const from = firstOpenMonth(state);
  const months = Math.max(1, monthDiff(from, deadline) + 1);
  const need = Math.max(0, target - have);
  const perMonth = round2(need / months);
  const capacity = standardMonth(state).saved;
  return { months, perMonth, share: capacity > 0 ? perMonth / capacity : Infinity, feasible: perMonth <= capacity, capacity, from };
}

/* ---------- Enveloppes hebdo ---------- */
export function weekEnvelope(state, item, now = new Date()) {
  const key = monthKeyOf(now);
  const carry = carryIn(state, key, item.id);
  const B = Math.max(0, item.amount + carry);
  const D = daysInMonth(key);
  const dom = now.getDate();
  const dow = (now.getDay() + 6) % 7; // lundi = 0
  const startDay = Math.max(1, dom - dow);
  const endDay = Math.min(D, dom + (6 - dow));
  const list = expensesOf(state, key, item.id);
  const day = (e) => Number(e.date.slice(8, 10));
  const spentBefore = list.filter((e) => day(e) < startDay).reduce((a, e) => a + e.amount, 0);
  const spentWeek = list.filter((e) => day(e) >= startDay && day(e) <= endDay).reduce((a, e) => a + e.amount, 0);
  const spentMonth = list.reduce((a, e) => a + e.amount, 0);
  const weekBudget = (B * (endDay - startDay + 1)) / D;
  const report = item.rollover === 'next' ? (B * (startDay - 1)) / D - spentBefore : 0;
  return {
    monthBudget: B, carry, weekBudget: round2(weekBudget), report: round2(report),
    spentWeek: round2(spentWeek), spentMonth: round2(spentMonth), remaining: round2(weekBudget + report - spentWeek), startDay, endDay,
  };
}

/* ---------- Échéances ---------- */
export function dueInfo(item, key, now = new Date()) {
  if (!item.day) return null;
  const [y, m] = key.split('-').map(Number);
  const d = Math.min(item.day, daysInMonth(key));
  const due = new Date(y, m - 1, d);
  return { day: d, date: due, inDays: daysBetween(now, due) };
}
