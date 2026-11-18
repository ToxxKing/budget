import { useState } from 'react';
import { Calendar, Check, Landmark, Plus, Target, AlertTriangle, Flag } from 'lucide-react';
import { useApp } from '../lib/store';
import { eur, parseAmount, toInput } from '../lib/format';
import { addMonths, monthDiff, monthLabel, monthRange, monthShort, todayKey } from '../lib/dates';
import { currentBalances, currentCapital, firstOpenMonth, goalPlan, potMonthly, potValue, project, reachDate, shares, standardMonth } from '../lib/engine';
import { Bar, CatIcon, Chip, Field, MonthSelect, PageTitle, SectionTitle } from '../components/ui';

const PALIERS = [{ v: 3000, name: 'Palier 1' }, { v: 5000, name: 'Palier 2' }, { v: 10000, name: 'Objectif principal' }];

export default function Savings() {
  const { state, update, openSheet } = useApp();
  const tKey = todayKey();
  const capital = currentCapital(state);
  const balances = currentBalances(state);
  const sh = shares(state.accounts);
  const std = standardMonth(state);
  const proj = project(state, Math.max(1, monthDiff(state.settings.startMonth, '2027-12') + 1));
  const end2027 = proj[proj.length - 1]?.capital;
  const openKey = firstOpenMonth(state);
  const endOpen = proj.find((p) => p.key === openKey)?.capital;
  const totalPct = state.pots.reduce((a, p) => a + (p.pct || 0), 0);
  const closedCount = Object.keys(state.months).length;

  // Objectif inversé
  const [goal, setGoal] = useState({ target: '2000', deadline: addMonths(tKey, 8) });
  const g = goalPlan(state, { target: parseAmount(goal.target), deadline: goal.deadline });

  return (
    <div>
      <PageTitle eyebrow="Objectifs & paliers" title="Épargne" />

      <section className="applecard p-5 mb-5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-muted font-medium">Capital réel</span>
          <Chip className="!bg-white/10 !text-white/80">{closedCount ? `${closedCount} mois clôturé${closedCount > 1 ? 's' : ''}` : 'Solde de départ'}</Chip>
        </div>
        <div className="num mt-1 text-[44px] font-extrabold tracking-tight leading-none">{eur(capital)}</div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-[12px]">
          <div className="rounded-xl bg-black/30 p-2.5"><div className="text-muted">Fin {monthShort(openKey)}</div><div className="num text-[15px] font-bold">{eur(endOpen ?? capital, 0)}</div></div>
          <div className="rounded-xl bg-black/30 p-2.5"><div className="text-muted">Surplus type</div><div className="num text-[15px] font-bold text-good">+{eur(std.saved, 0)}</div></div>
          <div className="rounded-xl bg-black/30 p-2.5"><div className="text-muted">Fin 2027</div><div className="num text-[15px] font-bold">{end2027 != null ? eur(end2027, 0) : '—'}</div></div>
        </div>
        <div className="mt-3 text-[12px] text-muted">Le capital réel avance à chaque clôture de mois. Les projections ajoutent le surplus prévu, les revenus annexes et les intérêts.</div>
      </section>

      {/* Comptes */}
      <SectionTitle right={`${state.accounts.length} compte${state.accounts.length > 1 ? 's' : ''}`}>Comptes</SectionTitle>
      <div className="card divide-y divide-line mb-2 overflow-hidden">
        {state.accounts.map((a, i) => (
          <button key={a.id} onClick={() => openSheet('account', a)} className="w-full min-h-[68px] flex items-center gap-3 px-4 text-left active:bg-card2">
            <CatIcon icon={Landmark} color="#5eead4" />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold truncate">{a.name}</div>
              <div className="num text-[12px] text-muted">{a.rate ? `${toInput(a.rate)} %/an · ≈ ${eur((balances[i] * a.rate) / 100, 0)}/an d'intérêts` : 'Sans intérêts'} · reçoit {Math.round(sh[i] * 100)} %</div>
            </div>
            <div className="num font-bold">{eur(balances[i], 0)}</div>
          </button>
        ))}
      </div>
      <button onClick={() => openSheet('account', {})} className="mb-1 w-full min-h-[48px] flex items-center justify-center gap-2 text-[15px] text-accent"><Plus size={18} /> Ajouter un compte (Livret A, LDDS…)</button>
      <p className="mb-5 text-[12px] text-faint px-1">Intérêts calculés chaque mois sur le solde, une approximation : le Livret A compte en réalité par quinzaine et verse en fin d'année.</p>

      {/* Paliers */}
      <SectionTitle>Paliers</SectionTitle>
      <div className="card divide-y divide-line mb-5">
        {PALIERS.map((p, i) => {
          const r = reachDate(state, p.v);
          const done = r.reached;
          return (
            <div key={p.v} className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div><div className="text-[13px] text-muted">{p.name}</div><div className="num text-[22px] font-bold">{eur(p.v)}</div></div>
                <div className="text-right">
                  {done ? <Chip tone="good"><Check size={13} /> Atteint</Chip> : r.key ? <Chip tone="accent"><Calendar size={13} /> {monthLabel(r.key)}</Chip> : <Chip tone="bad">Hors de portée</Chip>}
                  {!done && r.key && <div className="text-[12px] text-faint mt-1">dans {Math.max(0, monthDiff(tKey, r.key))} mois</div>}
                </div>
              </div>
              <Bar value={capital} max={p.v} color={i === 2 ? 'linear-gradient(90deg,#8fa8ff,#4ade80)' : done ? 'var(--good)' : 'var(--accent)'} />
              <div className="num mt-1.5 text-[12px] text-faint">{Math.min(100, Math.round((capital / p.v) * 100))} % · encore {eur(Math.max(0, p.v - capital))}</div>
            </div>
          );
        })}
      </div>

      {/* Objectif inversé */}
      <SectionTitle>Objectif inversé</SectionTitle>
      <section className="card p-4 mb-5">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Je veux (€)"><input id="goal-target" inputMode="decimal" value={goal.target} onChange={(e) => setGoal({ ...goal, target: e.target.value })} className="input num w-full font-semibold" /></Field>
          <Field label="Pour"><MonthSelect id="goal-deadline" value={goal.deadline} onChange={(v) => setGoal({ ...goal, deadline: v })} months={monthRange(openKey, 60)} labelFn={monthLabel} /></Field>
        </div>
        {parseAmount(goal.target) > 0 && (
          <div className="rounded-2xl bg-card2 p-4">
            <div className="text-[13px] text-muted">À mettre de côté chaque mois</div>
            <div className="num text-[30px] font-extrabold leading-tight">{eur(g.perMonth, 0)}</div>
            <div className="num text-[13px] mt-1 text-muted">pendant {g.months} mois, de {monthLabel(g.from).toLowerCase()} à {monthLabel(goal.deadline).toLowerCase()}</div>
            <div className="mt-3"><Bar value={g.perMonth} max={Math.max(1, g.capacity)} color={g.feasible ? 'var(--good)' : 'var(--bad)'} /></div>
            <div className={`num mt-1.5 text-[13px] ${g.feasible ? 'text-good' : 'text-bad'}`}>
              {g.feasible ? `${Math.round(g.share * 100)} % de ton surplus type (${eur(g.capacity, 0)}/mois)` : `Plus que ton surplus type (${eur(g.capacity, 0)}/mois) : recule la date ou baisse le montant.`}
            </div>
            <button onClick={() => openSheet('pot', { name: 'Nouvel objectif', pct: Math.min(100, Math.ceil((g.share * 100) / 5) * 5), target: parseAmount(goal.target), deadline: goal.deadline })}
              className="mt-3 w-full min-h-[46px] rounded-xl border border-line text-[15px] text-accent flex items-center justify-center gap-2"><Flag size={16} /> En faire une cagnotte</button>
          </div>
        )}
      </section>

      {/* Cagnottes */}
      <SectionTitle right={<span className={totalPct > 100 ? 'text-bad' : ''}>{totalPct} % alloué</span>}>Cagnottes</SectionTitle>
      <div className="space-y-3">
        {state.pots.map((p) => {
          const value = potValue(state, p);
          const monthly = potMonthly(state, p);
          const need = p.target && p.deadline ? goalPlan(state, { target: p.target, deadline: p.deadline, have: value }) : null;
          const eta = p.target && monthly > 0 && value < p.target ? addMonths(openKey, Math.ceil((p.target - value) / monthly) - 1) : null;
          return (
            <section key={p.id} className="card p-4">
              <button onClick={() => openSheet('pot', p)} className="w-full flex items-center gap-3 text-left min-h-[44px]">
                <CatIcon icon={Target} color="#5eead4" />
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] font-semibold truncate">{p.name}</div>
                  <div className="num text-[12px] text-muted">{eur(value, 0)}{p.target ? ` / ${eur(p.target)}` : ''} · {eur(monthly, 0)}/mois</div>
                </div>
                <div className="num text-[18px] font-bold">{p.pct} %</div>
              </button>
              {p.target ? <div className="mt-3"><Bar value={value} max={p.target} color="#5eead4" height={8} /></div> : null}
              <input type="range" id={`pot-${p.id}`} min="0" max="100" step="5" value={p.pct} aria-label={`Part de l'épargne pour ${p.name}`}
                onChange={(e) => { const v = Number(e.target.value); update((s) => ({ ...s, pots: s.pots.map((x) => (x.id === p.id ? { ...x, pct: v } : x)) })); }} />
              <div className="num text-[12px] text-faint flex flex-wrap justify-between gap-x-3 gap-y-1">
                {need ? (
                  <span className={need.perMonth > monthly ? 'text-warn' : 'text-good'}>
                    {value >= p.target ? 'Objectif atteint' : `Il faut ${eur(need.perMonth, 0)}/mois d'ici ${monthShort(p.deadline)}${need.perMonth > monthly ? ` (tu mets ${eur(monthly, 0)})` : ''}`}
                  </span>
                ) : eta ? <span>Objectif vers {monthLabel(eta).toLowerCase()}</span> : <span>{p.target && value >= p.target ? 'Objectif atteint' : 'Pas d’objectif daté'}</span>}
              </div>
            </section>
          );
        })}
        {totalPct < 100 && <div className="px-1 text-[13px] text-faint">{100 - totalPct} % non alloué reste en épargne libre ({eur((std.saved * (100 - totalPct)) / 100, 0)}/mois).</div>}
        {totalPct > 100 && <div className="px-1 text-[13px] text-bad flex items-center gap-1.5"><AlertTriangle size={15} /> Tu alloues plus de 100 % : baisse une cagnotte.</div>}
        <button onClick={() => openSheet('pot', {})} className="w-full min-h-[48px] rounded-2xl bg-card2 border border-line font-medium text-[15px] flex items-center justify-center gap-2"><Plus size={18} /> Nouvelle cagnotte</button>
      </div>
      <p className="mt-2 text-[12px] text-faint px-1">Une cagnotte grossit à chaque clôture, selon sa part de ce que tu as réellement épargné.</p>
    </div>
  );
}
