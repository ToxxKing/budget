import { useMemo, useState } from 'react';
import { RotateCcw, Sparkles, Lock } from 'lucide-react';
import { useApp } from '../lib/store';
import { CATS, SPEND_CATS } from '../lib/defaults';
import { eur } from '../lib/format';
import { clampKey, monthDiff, monthLabel, monthRange, monthShort, todayKey } from '../lib/dates';
import { actualMonth, planMonth, project, reachDate, standardMonth } from '../lib/engine';
import { Donut, LineChart, CompareBars } from '../components/charts';
import { GhostBtn, MonthSelect, PageTitle, Segmented } from '../components/ui';

export default function Analytics() {
  const { state, openSheet } = useApp();
  const start = state.settings.startMonth;
  const tKey = todayKey();
  const curKey = clampKey(tKey, start, monthRange(start, 26)[25]);

  // Répartition
  const [p, setP] = useState('month');
  const calc = p === 'month' ? planMonth(state, curKey) : standardMonth(state);
  const donut = SPEND_CATS.map((k) => ({ key: k, label: CATS[k].short, value: calc.byCat[k], color: CATS[k].color })).filter((d) => d.value > 0);

  // Prévu vs réel
  const pastMonths = monthRange(start, Math.max(1, monthDiff(start, curKey) + 1)).reverse();
  const [cmpKey, setCmpKey] = useState(curKey);
  const snap = state.months[cmpKey];
  const planned = snap ? snap.planned.byCat : planMonth(state, cmpKey).byCat;
  const actual = snap ? snap.byCat : actualMonth(state, cmpKey).byCat;
  const rows = SPEND_CATS.map((k) => ({ key: k, label: CATS[k].label, color: CATS[k].color, planned: planned[k] || 0, actual: actual[k] || 0 })).filter((r) => r.planned || r.actual);
  const totP = rows.reduce((a, r) => a + r.planned, 0);
  const totA = rows.reduce((a, r) => a + r.actual, 0);

  // Historique
  const history = Object.entries(state.months).sort(([a], [b]) => b.localeCompare(a));

  // Projection & simulateur
  const months = Math.max(2, monthDiff(start, '2027-12') + 1);
  const [sorties, setSorties] = useState(0);
  const [charge, setCharge] = useState(0);
  const [extra, setExtra] = useState(0);
  const simActive = !!(sorties || charge || extra);
  const sim = { sorties, charge, income: extra };
  const base = useMemo(() => project(state, months), [state, months]);
  const simP = useMemo(() => (simActive ? project(state, months, sim) : null), [state, months, sorties, charge, extra]); // eslint-disable-line
  const rBase = reachDate(state, 10000);
  const rSim = simActive ? reachDate(state, 10000, sim) : rBase;
  const delay = rBase.key && rSim.key ? monthDiff(rBase.key, rSim.key) : null;
  const endDiff = simP ? simP[simP.length - 1].capital - base[base.length - 1].capital : 0;

  const slider = (id, label, v, set, max, step) => (
    <div className="mb-1">
      <div className="flex justify-between text-[14px]"><label htmlFor={id} className="text-muted">{label}</label><span className="num font-semibold">{v ? `+${eur(v)}/mois` : '—'}</span></div>
      <input id={id} type="range" min="0" max={max} step={step} value={v} onChange={(e) => set(Number(e.target.value))} />
    </div>
  );

  return (
    <div>
      <PageTitle eyebrow="Graphiques & simulateur" title="Analyses" />

      <section className="card p-4 mb-5">
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="text-[17px] font-bold">Répartition prévue</h2>
          <Segmented className="w-[190px]" value={p} onChange={setP} options={[{ value: 'month', label: monthShort(curKey) }, { value: 'std', label: 'Standard' }]} />
        </div>
        {donut.length ? <Donut data={donut} total={calc.expenses} /> : <div className="text-[14px] text-faint">Aucune dépense prévue.</div>}
      </section>

      <section className="card p-4 mb-5">
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="text-[17px] font-bold">Prévu vs réel</h2>
          <div className="w-[170px]"><MonthSelect id="cmp-month" value={cmpKey} onChange={setCmpKey} months={pastMonths} labelFn={monthLabel} /></div>
        </div>
        <div className="num mb-4 flex items-baseline gap-2 text-[14px]">
          <span className="text-[24px] font-bold">{eur(totA)}</span><span className="text-faint">dépensés sur {eur(totP)} prévus</span>
          {snap && <Lock size={14} className="text-good self-center" aria-label="Mois clôturé" />}
        </div>
        <CompareBars rows={rows} />
        {!snap && <p className="mt-3 text-[12px] text-faint">Le réel compte tes dépenses saisies et les échéances cochées. Il devient définitif à la clôture.</p>}
        <button onClick={() => openSheet('expenses', { month: cmpKey })} className="mt-3 w-full min-h-[46px] rounded-xl border border-line text-[15px] text-accent">Voir les dépenses de {monthLabel(cmpKey).toLowerCase()}</button>
      </section>

      <section className="card p-4 mb-5">
        <h2 className="text-[17px] font-bold mb-2">Historique</h2>
        {history.length === 0 ? (
          <p className="text-[14px] text-muted">Aucun mois clôturé pour l'instant. Clôture {monthLabel(start).toLowerCase()} depuis l'accueil à la fin du mois pour démarrer l'historique.</p>
        ) : (
          <div className="divide-y divide-line -mx-4">
            {history.map(([k, m]) => {
              const d = m.saved - m.planned.saved;
              return (
                <div key={k} className="px-4 py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1"><div className="text-[15px] font-semibold">{monthLabel(k)}</div><div className="num text-[12px] text-faint">{eur(m.spent)} dépensés · {eur(m.income)} reçus</div></div>
                  <div className="text-right num"><div className="font-bold">{eur(m.saved)}</div><div className={`text-[12px] ${d >= 0 ? 'text-good' : 'text-bad'}`}>{d >= 0 ? '+' : ''}{eur(d)} vs prévu</div></div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card p-4 mb-5">
        <h2 className="text-[17px] font-bold">Projection jusqu'à fin 2027</h2>
        <div className="flex gap-4 text-[12px] text-muted mt-1 mb-2">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-accent" /> Actuel</span>
          {simP && <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-warn" /> Simulé</span>}
          {history.length > 0 && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> Réel clôturé</span>}
        </div>
        <LineChart base={base} sim={simP} />
      </section>

      <section className="applecard p-5">
        <div className="flex items-center gap-2 mb-1"><Sparkles size={18} className="text-warn" /><h2 className="text-[17px] font-bold">Et si ?</h2></div>
        <p className="text-[13px] text-muted mb-3">Teste l'effet d'un changement sur la date d'atteinte des 10 000 €.</p>
        {slider('sim-sorties', 'Hausse du budget sorties', sorties, setSorties, 500, 10)}
        {slider('sim-charge', 'Nouvelle charge mensuelle', charge, setCharge, 500, 5)}
        {slider('sim-extra', 'Revenu supplémentaire', extra, setExtra, 1000, 25)}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-black/30 p-3"><div className="text-[12px] text-muted">Aujourd'hui</div><div className="text-[17px] font-bold">{rBase.reached ? 'Atteint' : rBase.key ? monthLabel(rBase.key) : 'Jamais'}</div></div>
          <div className="rounded-2xl bg-black/30 p-3"><div className="text-[12px] text-muted">Avec ces choix</div>
            <div className={`text-[17px] font-bold ${delay > 0 ? 'text-warn' : delay < 0 ? 'text-good' : ''}`}>{rSim.reached ? 'Atteint' : rSim.key ? monthLabel(rSim.key) : 'Jamais'}</div></div>
        </div>
        <div className="mt-2 text-[13px] text-muted min-h-[20px]">
          {!simActive ? 'Bouge un curseur pour comparer.' : !rSim.key && !rSim.reached ? "Avec ces choix, ton surplus devient négatif : tu n'atteins plus les 10 000 €." : delay === 0 ? 'Aucun décalage de date.' : delay > 0 ? `Recul de ${delay} mois.` : `Avance de ${-delay} mois.`}
          {simP && <span className="num"> Capital fin 2027 : {eur(simP[simP.length - 1].capital, 0)} ({endDiff >= 0 ? '+' : ''}{eur(endDiff, 0)}).</span>}
        </div>
        {simActive && <GhostBtn className="mt-3 w-full" onClick={() => { setSorties(0); setCharge(0); setExtra(0); }}><RotateCcw size={16} /> Remettre à zéro</GhostBtn>}
      </section>
    </div>
  );
}
