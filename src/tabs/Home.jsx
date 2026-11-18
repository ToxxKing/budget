import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Plus, Zap, Lock, Unlock, CloudUpload, Smartphone, X, Flame, ChevronRight as Go } from 'lucide-react';
import { useApp } from '../lib/store';
import { CATS } from '../lib/defaults';
import { CAT_ICONS } from '../components/icons';
import { eur } from '../lib/format';
import { addMonths, clampKey, formatDay, monthLabel, todayKey, monthName } from '../lib/dates';
import { canClose, dueInfo, expensesOf, forecastMonth, isEnvelope, lastClosedMonth, paidKey, planMonth, streakDays, weekEnvelope } from '../lib/engine';
import { isIOS, isStandalone } from '../lib/storage';
import { Bar, CatIcon, Chip, PageTitle, SectionTitle } from '../components/ui';
import { AnimatedNumber, TiltCard, Ring } from '../components/motion';
import { confetti, confettiFrom } from '../lib/fx';

function dueChip(info, done, isIncome) {
  if (done) return <Chip tone="good"><Check size={12} strokeWidth={3} /> {isIncome ? 'Reçu' : 'Payé'}</Chip>;
  if (!info) return <Chip>Sans date</Chip>;
  if (info.inDays < 0) return <Chip tone="bad">En retard · {-info.inDays} j</Chip>;
  if (info.inDays === 0) return <Chip tone="warn">Aujourd'hui</Chip>;
  if (info.inDays <= 3) return <Chip tone="warn">Dans {info.inDays} j</Chip>;
  return <Chip tone="accent">Le {info.day}</Chip>;
}

export default function Home() {
  const { state, update, updateMeta, notify, openSheet, backupNow } = useApp();
  const now = new Date();
  const tKey = todayKey(now);
  const start = state.settings.startMonth;
  const maxKey = addMonths(start, 25);
  const [key, setKey] = useState(() => clampKey(tKey, start, maxKey));

  const plan = planMonth(state, key);
  const fc = forecastMonth(state, key);
  const snap = state.months[key];
  const isCurrent = key === tKey;
  const rate = fc.income > 0 ? Math.round((fc.saved / fc.income) * 100) : 0;
  const hasDebts = plan.lines.some((l) => l.cat === 'dette');

  // Bannières
  const lastBackup = state.meta.lastBackupAt ? new Date(state.meta.lastBackupAt) : null;
  const daysSince = lastBackup ? Math.floor((now - lastBackup) / 86400000) : null;
  const changedSince = !lastBackup || (state.meta.updatedAt && new Date(state.meta.updatedAt) > lastBackup);
  const needBackup = changedSince && state.meta.updatedAt && (daysSince == null || daysSince >= state.settings.remindDays);
  const showInstall = !isStandalone() && isIOS() && !state.meta.installHintDismissed;

  // Échéances : charges fixes, dettes, revenus annexes
  const dues = [...plan.lines, ...plan.incomes]
    .map((it) => ({ it, k: paidKey(key, it.id), info: dueInfo(it, key, now) }))
    .sort((a, b) => {
      const pa = !!state.paid[a.k], pb = !!state.paid[b.k];
      if (pa !== pb) return pa - pb;
      const da = a.info ? a.info.day : 99, db = b.info ? b.info.day : 99;
      return da - db || b.it.amount - a.it.amount;
    });
  const remaining = dues.filter((d) => d.it.cat !== 'revenu' && !state.paid[d.k]).reduce((a, d) => a + d.it.amount, 0);
  const toggle = (d, ev) => {
    if (snap) return;
    const on = !!state.paid[d.k];
    if (!on) {
      confettiFrom(ev?.currentTarget?.querySelector('[data-check]'), { count: 18, power: 0.7, spread: 1.4 });
      const left = dues.filter((x) => x.it.cat !== 'revenu' && !state.paid[x.k] && x.k !== d.k).length;
      if (left === 0 && d.it.cat !== 'revenu') setTimeout(() => { confetti({ y: window.innerHeight * 0.35, count: 120, power: 1.5, spread: 1.7 }); notify('Toutes les échéances sont réglées, bravo !', 'party'); }, 250);
    }
    update((s) => {
      const paid = { ...s.paid };
      if (on) delete paid[d.k]; else paid[d.k] = { at: new Date().toISOString(), amount: d.it.amount };
      return { ...s, paid };
    });
    notify(on ? `${d.it.name} : décoché` : d.it.cat === 'revenu' ? `${d.it.name} reçu, super !` : `${d.it.name} réglé`, on ? 'info' : 'good');
  };

  const envelopes = state.items.filter(isEnvelope);
  const live = isCurrent && !snap;
  const streak = live ? streakDays(state, now) : 0;
  const recent = [...state.expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const itemsById = new Map(state.items.map((i) => [i.id, i]));
  const reopenable = snap && lastClosedMonth(state) === key;

  return (
    <div>
      <PageTitle eyebrow={now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        title={`${now.getHours() >= 18 || now.getHours() < 5 ? 'Bonsoir' : 'Bonjour'}${state.settings.firstName ? ` ${state.settings.firstName}` : ''}`} />

      {showInstall && (
        <div className="mb-3 card p-4 flex gap-3 items-start">
          <Smartphone size={22} className="text-accent shrink-0 mt-0.5" />
          <div className="flex-1 text-[14px]">
            <div className="font-semibold mb-0.5">Installe l'appli sur ton iPhone</div>
            <div className="text-muted">Dans Safari : bouton Partager, puis « Sur l'écran d'accueil ». Tes données y sont mieux protégées.</div>
          </div>
          <button onClick={() => updateMeta({ installHintDismissed: true })} className="tap grid place-items-center -mr-2 -mt-2 text-faint" aria-label="Masquer"><X size={18} /></button>
        </div>
      )}
      {needBackup && (
        <button onClick={backupNow} className="mb-3 w-full card p-4 flex gap-3 items-center text-left border-warn/40">
          <CloudUpload size={22} className="text-warn shrink-0" />
          <div className="flex-1 text-[14px]">
            <div className="font-semibold">{lastBackup ? `Dernière sauvegarde il y a ${daysSince} jour${daysSince > 1 ? 's' : ''}` : 'Aucune sauvegarde pour l’instant'}</div>
            <div className="text-muted">Touche pour enregistrer une copie dans Fichiers iCloud.</div>
          </div>
          <Go size={18} className="text-faint" />
        </button>
      )}

      {/* Sélecteur de mois */}
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => setKey(addMonths(key, -1))} disabled={key <= start} className="tap grid place-items-center rounded-full bg-card border border-line disabled:opacity-30" aria-label="Mois précédent"><ChevronLeft size={20} /></button>
        <button onClick={() => setKey(clampKey(tKey, start, maxKey))} className="flex-1 min-h-[48px] rounded-2xl bg-card border border-line px-3 text-center">
          <div className="text-[16px] font-semibold leading-tight">{monthLabel(key)}</div>
          <div className="text-[12px] text-muted leading-tight">{snap ? 'Clôturé' : hasDebts ? 'Avec dettes' : key > tKey ? 'À venir' : isCurrent ? 'Mois en cours' : 'Non clôturé'}</div>
        </button>
        <button onClick={() => setKey(addMonths(key, 1))} disabled={key >= maxKey} className="tap grid place-items-center rounded-full bg-card border border-line disabled:opacity-30" aria-label="Mois suivant"><ChevronRight size={20} /></button>
      </div>

      {/* Carte principale */}
      <TiltCard className={`applecard p-5 mb-3 ${rate >= 50 ? 'warm' : ''}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium text-muted">{snap ? 'Épargné ce mois' : 'Reste à vivre disponible'}</span>
          <Chip className="!bg-white/10 !text-white/80">{snap ? 'Réel' : key > tKey ? 'Prévu' : 'Prévision'}</Chip>
        </div>
        <AnimatedNumber value={fc.saved} format={(v) => eur(v)} className={`num block mt-2 text-[46px] font-extrabold tracking-tight leading-none ${fc.saved < 0 ? 'text-bad' : ''}`} />
        <div className="mt-1 text-[13px] text-muted">
          {snap ? `sur ${eur(snap.income)} reçus · prévu ${eur(snap.planned.saved)}` : `après charges, dettes et enveloppes, sur ${eur(fc.income)} de revenus`}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-black/30 p-3">
            <div className="text-[12px] text-muted">Total dépensé</div>
            <AnimatedNumber value={fc.spent} format={(v) => eur(v)} className="num block text-[20px] font-bold" />
            <div className="num text-[11px] text-faint">sur {eur(plan.expenses)} prévus</div>
          </div>
          <div className="rounded-2xl bg-black/30 p-3 flex items-center gap-3">
            <Ring size={38} stroke={4.5} value={rate / 100} color={rate >= 50 ? 'var(--good)' : rate >= 20 ? 'var(--warn)' : 'var(--bad)'} />
            <div className="min-w-0">
            <div className="text-[12px] text-muted">Épargne</div>
            <AnimatedNumber value={rate} format={(v) => `${Math.round(v)} %`} className={`num block text-[20px] font-bold ${rate >= 50 ? 'text-good' : rate >= 20 ? 'text-warn' : 'text-bad'}`} />
            <div className="text-[11px] text-faint">{rate >= 50 ? 'Excellent !' : rate >= 20 ? 'Pas mal du tout' : 'On remonte ça'}</div>
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-black/40 overflow-hidden flex" aria-hidden="true">
          {['fixe', 'vie', 'shopping', 'dette'].map((c) => plan.byCat[c] > 0 && (
            <div key={c} className="bar-fill" style={{ width: `${(plan.byCat[c] / Math.max(plan.income, plan.expenses)) * 100}%`, background: CATS[c].color }} />
          ))}
        </div>
      </TiltCard>
      {live && streak > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[#ffc24b]/25 bg-[#ffc24b]/[.07] px-4 py-3">
          <Flame size={22} className="flicker text-[#ffc24b] shrink-0" fill="#ffc24b" fillOpacity={0.25} />
          <div className="flex-1 text-[14px]">
            <div className="font-semibold"><AnimatedNumber value={streak} format={(v) => `${Math.round(v)} jour${Math.round(v) > 1 ? 's' : ''}`} /> dans les clous</div>
            <div className="text-muted text-[13px]">Tes enveloppes restent sous le budget prévu à ce jour.</div>
          </div>
        </div>
      )}
      {live && streak === 0 && envelopes.length > 0 && (
        <div className="mb-5 rounded-2xl border border-line px-4 py-3 text-[13px] text-muted">Tes enveloppes sont un peu au-dessus du rythme prévu. Quelques jours tranquilles et la série repart.</div>
      )}
      {!live && <div className="mb-2" />}

      {/* Enveloppes */}
      <section className="mb-5">
        <SectionTitle right={isCurrent && !snap ? (() => { const w = weekEnvelope(state, { amount: 0, id: '' }, now); return `${w.startDay}–${w.endDay} ${now.toLocaleDateString('fr-FR', { month: 'short' })}`; })() : null}>
          {isCurrent && !snap ? 'Cette semaine' : `Enveloppes de ${monthName(key).toLowerCase()}`}
        </SectionTitle>
        <div className="card divide-y divide-line">
          {envelopes.length === 0 && <div className="p-4 text-[14px] text-muted">Aucune enveloppe. Ajoute une ligne « Vie courante » ou « Shopping » dans Budget.</div>}
          {envelopes.map((env) => {
            const Icon = CAT_ICONS[env.cat];
            if (isCurrent && !snap) {
              const w = weekEnvelope(state, env, now);
              const avail = w.weekBudget + w.report;
              return (
                <div key={env.id} className="p-4">
                  <div className="flex items-center gap-3 mb-2.5">
                    <span className={w.remaining < 0 ? 'wiggle' : ''}><CatIcon icon={Icon} color={CATS[env.cat].color} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold truncate">{env.name}</div>
                      <div className="num text-[13px] text-muted">{eur(w.spentWeek, 0)} / {eur(avail, 0)} cette semaine</div>
                    </div>
                    <button onClick={() => openSheet('expense', { itemId: env.id })} className="tap grid place-items-center rounded-full bg-card2 border border-line text-accent" aria-label={`Ajouter une dépense : ${env.name}`}><Plus size={20} /></button>
                  </div>
                  <Bar value={w.spentWeek} max={avail} color={CATS[env.cat].color} />
                  <div className="num mt-2 flex justify-between gap-2 text-[12px]">
                    <span className={w.remaining < 0 ? 'text-bad font-semibold' : 'text-muted'}>
                      {w.remaining < 0 ? `Dépassement ${eur(-w.remaining, 0)}` : `Reste ${eur(w.remaining, 0)}`}
                      {env.rollover === 'next' && Math.round(w.report) !== 0 && <span className={w.report > 0 ? 'text-good' : 'text-bad'}> · report {w.report > 0 ? '+' : ''}{eur(w.report, 0)}</span>}
                    </span>
                    <span className="text-faint">Mois {eur(w.spentMonth, 0)} / {eur(w.monthBudget)}</span>
                  </div>
                </div>
              );
            }
            const budget = plan.envelopes.find((e) => e.item.id === env.id)?.budget ?? env.amount;
            const spent = expensesOf(state, key, env.id).reduce((a, e) => a + e.amount, 0);
            return (
              <div key={env.id} className="p-4">
                <div className="flex items-center gap-3 mb-2.5">
                  <CatIcon icon={Icon} color={CATS[env.cat].color} />
                  <div className="min-w-0 flex-1"><div className="text-[15px] font-semibold truncate">{env.name}</div>
                    <div className="num text-[13px] text-muted">{eur(spent)} / {eur(budget)}</div></div>
                </div>
                <Bar value={spent} max={budget} color={CATS[env.cat].color} />
              </div>
            );
          })}
        </div>
        {isCurrent && !snap && (
          <button onClick={() => openSheet('expense', { itemId: envelopes[0]?.id })}
            className="press mt-3 min-h-[56px] w-full rounded-2xl bg-accent text-accent-ink font-bold text-[17px] flex items-center justify-center gap-2 shadow-[0_12px_30px_-10px_rgba(143,168,255,.7)]">
            <Zap size={20} /> Dépense rapide
          </button>
        )}
        {recent.length > 0 && (
          <div className="mt-3 card overflow-hidden">
            <div className="divide-y divide-line">
              {recent.map((e) => {
                const it = itemsById.get(e.itemId);
                return (
                  <div key={e.id} className="flex items-center gap-3 px-4 min-h-[54px]">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: CATS[it?.cat || 'autre'].color }} />
                    <div className="min-w-0 flex-1"><div className="text-[15px] truncate">{e.note || it?.name || 'Hors budget'}</div><div className="text-[12px] text-faint">{formatDay(e.date)}</div></div>
                    <div className="num font-semibold">−{eur(e.amount)}</div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => openSheet('expenses', {})} className="w-full min-h-[48px] border-t border-line text-[15px] text-accent font-medium">Voir et rechercher toutes les dépenses</button>
          </div>
        )}
      </section>

      {/* Échéances */}
      <section className="mb-5">
        <SectionTitle right={remaining > 0 ? `${eur(remaining)} à régler` : 'Tout est réglé'}>Échéances</SectionTitle>
        <div className="card divide-y divide-line overflow-hidden">
          {dues.map((d) => {
            const on = !!state.paid[d.k];
            const income = d.it.cat === 'revenu';
            return (
              <button key={d.k} onClick={(e) => toggle(d, e)} disabled={!!snap} aria-pressed={on}
                className="row-press w-full min-h-[64px] flex items-center gap-3 px-4 text-left active:bg-card2 disabled:active:bg-transparent">
                <span data-check className={`h-7 w-7 shrink-0 rounded-full border-2 grid place-items-center transition-colors duration-300 ${on ? 'bg-good border-good text-black' : 'border-line2'}`}>{on && <Check size={16} strokeWidth={3} className="pop" />}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[15px] truncate`}><span className={`strike ${on ? 'on text-faint' : ''}`}>{d.it.name}</span></span>
                  <span className="mt-1 flex">{dueChip(d.info, on, income)}</span>
                </span>
                <span className={`num font-semibold ${on ? 'text-faint' : income ? 'text-good' : ''}`}>{income ? '+' : ''}{eur(d.it.amount)}</span>
              </button>
            );
          })}
          {dues.length === 0 && <div className="p-4 text-[14px] text-muted">Aucune échéance ce mois-ci.</div>}
        </div>
        {dues.some((d) => !d.info && !state.paid[d.k]) && !snap && <p className="mt-2 text-[12px] text-faint px-1">Ajoute un jour d'échéance dans Budget pour voir le compte à rebours.</p>}
      </section>

      {/* Clôture */}
      {canClose(state, key, now) && (
        <button onClick={() => openSheet('close', { key })} className="w-full card p-4 flex items-center gap-3 text-left">
          <Lock size={20} className="text-accent shrink-0" />
          <div className="flex-1"><div className="text-[15px] font-semibold">Clôturer {monthLabel(key).toLowerCase()}</div><div className="text-[13px] text-muted">Fige le réel, calcule l'épargne et les reports.</div></div>
          <Go size={18} className="text-faint" />
        </button>
      )}
      {snap && (
        <div className="card p-4 flex items-center gap-3">
          <Lock size={20} className="text-good shrink-0" />
          <div className="flex-1 text-[14px]"><div className="font-semibold">Mois clôturé</div><div className="text-muted">le {new Date(snap.closedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</div></div>
          {reopenable && (
            <button onClick={() => { update((s) => { const months = { ...s.months }; delete months[key]; return { ...s, months }; }); notify(`${monthLabel(key)} rouvert`); }}
              className="tap px-3 rounded-xl bg-card2 border border-line text-[14px] flex items-center gap-1.5"><Unlock size={16} /> Rouvrir</button>
          )}
        </div>
      )}
    </div>
  );
}
