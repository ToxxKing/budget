import { describe, it, expect } from 'vitest';
import { defaultState, migrate } from './defaults';
import {
  planMonth, standardMonth, project, reachDate, buildClosing, currentCapital, firstOpenMonth,
  weekEnvelope, goalPlan, forecastMonth, canClose,
} from './engine';

const s0 = () => defaultState();

describe('budget prévu', () => {
  it('novembre 2026 avec dettes', () => {
    const m = planMonth(s0(), '2026-11');
    expect(m.expenses).toBe(1157);
    expect(m.byCat.dette).toBe(501);
    expect(m.saved).toBe(843);
  });
  it('mois standard', () => {
    const m = standardMonth(s0());
    expect(m.expenses).toBe(656);
    expect(m.saved).toBe(1344);
  });
});

describe('projection et paliers', () => {
  it('atteint 3 000, 5 000 puis 10 000 €', () => {
    const s = s0();
    expect(project(s, 3).map((x) => x.capital)).toEqual([1743, 3387, 5031]);
    expect(reachDate(s, 3000).key).toBe('2026-12');
    expect(reachDate(s, 5000).key).toBe('2027-01');
    expect(reachDate(s, 10000).key).toBe('2027-05');
  });
  it('les intérêts accélèrent la projection', () => {
    const s = s0();
    s.accounts[0].rate = 1.7;
    const p = project(s, 14);
    expect(p[13].capital).toBeGreaterThan(project(s0(), 14)[13].capital);
    expect(p[0].interest).toBeCloseTo(900 * 0.017 / 12, 2);
  });
  it('une simulation repousse la date', () => {
    expect(reachDate(s0(), 10000, { sorties: 600, charge: 0 }).key > '2027-05').toBe(true);
  });
});

describe('clôture et report', () => {
  it('une enveloppe sous-consommée en mode report alimente le mois suivant sans être comptée épargnée', () => {
    const s = s0();
    s.items.find((i) => i.id === 'sorties').rollover = 'next';
    s.expenses.push({ id: 'e1', itemId: 'sorties', amount: 100, date: '2026-11-10', note: '' });
    s.expenses.push({ id: 'e2', itemId: 'courses', amount: 100, date: '2026-11-11', note: '' });
    s.expenses.push({ id: 'e3', itemId: 'shopping', amount: 130, date: '2026-11-12', note: '' });
    const snap = buildClosing(s, '2026-11');
    expect(snap.carry.sorties).toBe(50);
    // 2000 − (276 + 501) − 330 dépensé − 50 mis de côté
    expect(snap.saved).toBe(843);
    s.months['2026-11'] = snap;
    const dec = planMonth(s, '2026-12');
    expect(dec.envelopes.find((e) => e.item.id === 'sorties').budget).toBe(200);
    expect(firstOpenMonth(s)).toBe('2026-12');
    expect(currentCapital(s)).toBe(1743);
  });
  it('dépenser moins augmente l\'épargne réelle', () => {
    const s = s0();
    s.expenses.push({ id: 'e1', itemId: 'sorties', amount: 50, date: '2026-11-10', note: '' });
    const snap = buildClosing(s, '2026-11');
    // enveloppes réelles : 50 au lieu de 380
    expect(snap.saved).toBe(2000 - 777 - 50);
  });
  it('on ne clôture que le premier mois ouvert déjà commencé', () => {
    const s = s0();
    expect(canClose(s, '2026-11', new Date(2026, 10, 18))).toBe(true);
    expect(canClose(s, '2026-12', new Date(2026, 10, 18))).toBe(false);
  });
});

describe('prévision du mois en cours', () => {
  it('un dépassement d\'enveloppe réduit le reste à vivre', () => {
    const s = s0();
    s.expenses.push({ id: 'e1', itemId: 'sorties', amount: 200, date: '2026-11-10', note: '' });
    expect(forecastMonth(s, '2026-11').saved).toBe(793);
  });
});

describe('enveloppe hebdo', () => {
  it('calcule le budget de la semaine au prorata des jours', () => {
    const s = s0();
    const w = weekEnvelope(s, s.items.find((i) => i.id === 'sorties'), new Date(2026, 10, 18));
    expect(w.startDay).toBe(16);
    expect(w.endDay).toBe(22);
    expect(w.weekBudget).toBe(35);
  });
});

describe('objectif inversé', () => {
  it('2 000 € pour juillet 2027', () => {
    const g = goalPlan(s0(), { target: 2000, deadline: '2027-07' });
    expect(g.months).toBe(9);
    expect(g.perMonth).toBeCloseTo(222.22, 2);
    expect(g.feasible).toBe(true);
  });
});

describe('migration', () => {
  it('importe une sauvegarde v1 de l\'artifact', () => {
    const v1 = {
      version: 1, settings: { salary: 2000, startSavings: 900, startMonth: '2026-11' },
      items: [{ id: 'sorties', name: 'Sorties', amount: 150, cat: 'vie', rec: 'mensuel' }],
      expenses: [{ id: 'x', envId: 'sorties', amount: 12, date: '2026-11-18T10:00:00.000Z', note: '' }],
      paid: {}, pots: [{ id: 'p', name: 'Voyage', pct: 30 }],
    };
    const s = migrate(v1);
    expect(s.version).toBe(2);
    expect(s.accounts[0].balance).toBe(900);
    expect(s.expenses[0].itemId).toBe('sorties');
    expect(s.expenses[0].date).toBe('2026-11-18');
  });
});

import { streakDays } from './engine';
describe('série', () => {
  it('compte les jours sous le budget proratisé', () => {
    const s = defaultState();
    const now = new Date(2026, 10, 18);
    expect(streakDays(s, now)).toBe(18);
    // 380 € d'enveloppes sur 30 jours ≈ 12,67 €/jour. 250 € le 10 → au-dessus jusqu'au jour 19.
    s.expenses.push({ id: 'x', itemId: 'sorties', amount: 250, date: '2026-11-10', note: '' });
    expect(streakDays(s, now)).toBe(0);
    expect(streakDays(s, new Date(2026, 10, 25))).toBe(6);
  });
});
