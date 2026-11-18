import { useEffect, useMemo, useState } from 'react';
import { Check, Trash2, Search, Lock } from 'lucide-react';
import { useApp } from '../lib/store';
import { CATS, CAT_ORDER, LIVRET_A_RATE } from '../lib/defaults';
import { CAT_ICONS } from './icons';
import { eur, parseAmount, toInput, uid } from '../lib/format';
import { formatDay, monthLabel, monthRange, todayDayKey } from '../lib/dates';
import { buildClosing, isEnvelope, shares, weekEnvelope } from '../lib/engine';
import { confetti, confettiFrom } from '../lib/fx';
import { AnimatedNumber } from './motion';
import { Sheet, Field, PrimaryBtn, GhostBtn, DangerBtn, Segmented, SwipeRow, MonthSelect } from './ui';

function ConfirmDelete({ label, onConfirm }) {
  const [ask, setAsk] = useState(false);
  if (!ask) return <GhostBtn type="button" className="mt-3 w-full text-bad" onClick={() => setAsk(true)}><Trash2 size={18} /> {label}</GhostBtn>;
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <GhostBtn type="button" onClick={() => setAsk(false)}>Annuler</GhostBtn>
      <DangerBtn type="button" onClick={onConfirm}>Confirmer</DangerBtn>
    </div>
  );
}

/* ---------- Dépense rapide ---------- */
export function ExpenseSheet() {
  const { state, update, notify, sheet, closeSheet } = useApp();
  const open = sheet?.type === 'expense';
  const envelopes = state.items.filter(isEnvelope);
  const [itemId, setItemId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayDayKey());
  useEffect(() => {
    if (!open) return;
    setItemId(sheet.data.itemId ?? envelopes[0]?.id ?? 'autre');
    setAmount(''); setNote(''); setDate(todayDayKey());
  }, [open]); // eslint-disable-line
  const val = parseAmount(amount);
  const choices = [...envelopes, { id: 'autre', name: 'Hors budget', cat: 'autre' }];
  const save = (e) => {
    e.preventDefault();
    if (!val) return;
    const env = state.items.find((i) => i.id === itemId);
    const left = env ? weekEnvelope(state, env).remaining - val : null;
    update((s) => ({ ...s, expenses: [...s.expenses, { id: uid(), itemId: itemId === 'autre' ? null : itemId, amount: val, note: note.trim(), date }] }));
    if (left != null && left >= 0) confettiFrom(e?.nativeEvent?.submitter || document.activeElement, { count: 22, power: 0.8 });
    notify(left == null ? `−${eur(val)} hors budget` : left >= 0 ? `C'est noté ! Il reste ${eur(left, 0)} cette semaine` : `Noté, enveloppe dépassée de ${eur(-left, 0)}`, left == null ? 'info' : left >= 0 ? 'good' : 'bad');
    closeSheet();
  };
  return (
    <Sheet open={open} onClose={closeSheet} title="Dépense rapide">
      <form onSubmit={save}>
        <div className="mb-4 grid grid-cols-1 gap-2">
          {choices.map((c) => {
            const Icon = CAT_ICONS[c.cat];
            const on = itemId === c.id;
            return (
              <button type="button" key={c.id} onClick={() => setItemId(c.id)}
                className={`min-h-[50px] rounded-2xl border px-3 flex items-center gap-3 text-left transition ${on ? 'border-accent bg-accent/10' : 'border-line bg-card2'}`}>
                <Icon size={20} style={{ color: CATS[c.cat].color }} /><span className="flex-1 text-[15px] font-medium">{c.name}</span>{on && <Check size={18} className="text-accent" />}
              </button>
            );
          })}
        </div>
        <Field label="Montant (€)">
          <input id="qe-amount" inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} className="input num w-full !min-h-[60px] !text-[28px] font-bold" />
        </Field>
        <div className="mb-4 flex flex-wrap gap-2">
          {[5, 10, 15, 20, 30, 50].map((v) => (
            <button type="button" key={v} onClick={() => setAmount(String(v))} className="tap px-4 rounded-full bg-card2 border border-line num text-[15px]">{v} €</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Date"><input id="qe-date" type="date" value={date} max={todayDayKey()} onChange={(e) => setDate(e.target.value || todayDayKey())} className="input w-full" /></Field>
          <Field label="Note"><input id="qe-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Facultatif" className="input w-full" /></Field>
        </div>
        <PrimaryBtn type="submit" disabled={!val}>Ajouter {val ? eur(val) : ''}</PrimaryBtn>
      </form>
    </Sheet>
  );
}

/* ---------- Toutes les dépenses (recherche + filtres) ---------- */
export function ExpensesListSheet() {
  const { state, update, notify, sheet, closeSheet } = useApp();
  const open = sheet?.type === 'expenses';
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [month, setMonth] = useState('');
  useEffect(() => { if (open) { setQ(''); setFilter(sheet.data.filter || 'all'); setMonth(sheet.data.month || ''); } }, [open]); // eslint-disable-line
  const items = new Map(state.items.map((i) => [i.id, i]));
  const months = [...new Set(state.expenses.map((e) => e.date.slice(0, 7)))].sort().reverse();
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return state.expenses
      .filter((e) => (filter === 'all' ? true : filter === 'autre' ? !items.get(e.itemId) : e.itemId === filter))
      .filter((e) => (month ? e.date.slice(0, 7) === month : true))
      .filter((e) => {
        if (!needle) return true;
        const name = items.get(e.itemId)?.name || 'Hors budget';
        return `${e.note} ${name} ${e.amount}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.expenses, q, filter, month]); // eslint-disable-line
  const total = list.reduce((a, e) => a + e.amount, 0);
  const chips = [{ id: 'all', name: 'Toutes' }, ...state.items.filter(isEnvelope), { id: 'autre', name: 'Hors budget' }];
  const del = (e) => { update((s) => ({ ...s, expenses: s.expenses.filter((x) => x.id !== e.id) })); notify('Dépense supprimée'); };
  return (
    <Sheet open={open} onClose={closeSheet} title="Dépenses" full>
      <div className="relative mb-3">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
        <input id="exp-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une note, un montant…" className="input w-full !pl-10" />
      </div>
      <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto pb-1 px-1 no-scrollbar">
        {chips.map((c) => (
          <button key={c.id} onClick={() => setFilter(c.id)} className={`tap shrink-0 rounded-full px-4 text-[14px] border whitespace-nowrap ${filter === c.id ? 'bg-fg text-bg border-fg font-semibold' : 'bg-card2 border-line text-muted'}`}>{c.name}</button>
        ))}
      </div>
      <div className="mb-3 grid grid-cols-[1fr_auto] gap-2 items-center">
        <MonthSelect id="exp-month" value={month} onChange={(v) => setMonth(v || '')} months={months} labelFn={monthLabel} allowEmpty emptyLabel="Tous les mois" />
        <div className="num text-right text-[14px] pr-1"><div className="text-faint text-[12px]">{list.length} dépense{list.length > 1 ? 's' : ''}</div><div className="font-bold">{eur(total)}</div></div>
      </div>
      <div className="card divide-y divide-line overflow-hidden">
        {list.map((e) => {
          const it = items.get(e.itemId);
          const cat = it?.cat || 'autre';
          return (
            <SwipeRow key={e.id} onDelete={() => del(e)}>
              <div className="flex items-center gap-3 px-4 min-h-[60px]">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: CATS[cat].color }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] truncate">{e.note || it?.name || 'Hors budget'}</div>
                  <div className="text-[12px] text-faint truncate">{formatDay(e.date)} · {it?.name || 'Hors budget'}</div>
                </div>
                <div className="num font-semibold">−{eur(e.amount)}</div>
              </div>
            </SwipeRow>
          );
        })}
        {list.length === 0 && <div className="p-5 text-center text-[14px] text-muted">Aucune dépense ne correspond.</div>}
      </div>
      {list.length > 0 && <p className="mt-2 text-[12px] text-faint px-1">Glisse une ligne vers la gauche pour la supprimer.</p>}
    </Sheet>
  );
}

/* ---------- Ligne de budget ---------- */
export function ItemSheet() {
  const { state, update, notify, sheet, closeSheet } = useApp();
  const open = sheet?.type === 'item';
  const item = sheet?.data;
  const isNew = !item?.id;
  const [f, setF] = useState({});
  useEffect(() => {
    if (!open) return;
    const cat = item.cat || 'fixe';
    setF({
      name: item.name || '', amount: toInput(item.amount), cat,
      rec: item.rec || (cat === 'dette' || cat === 'revenu' ? 'ponctuel' : 'mensuel'),
      month: item.month || state.settings.startMonth, day: item.day ? String(item.day) : '', rollover: item.rollover || 'save',
    });
  }, [open]); // eslint-disable-line
  const months = monthRange(state.settings.startMonth, 26);
  const val = parseAmount(f.amount);
  const env = f.cat === 'vie' || f.cat === 'shopping';
  const save = (e) => {
    e.preventDefault();
    if (!f.name?.trim() || !val) return;
    const data = {
      name: f.name.trim(), amount: val, cat: f.cat, rec: f.rec,
      ...(f.rec === 'ponctuel' ? { month: f.month } : {}),
      ...(env ? { rollover: f.rollover } : { day: f.day ? Number(f.day) : null }),
    };
    update((s) => ({ ...s, items: isNew ? [...s.items, { id: uid(), ...data }] : s.items.map((x) => (x.id === item.id ? { id: x.id, ...data } : x)) }));
    notify(isNew ? 'Ligne ajoutée' : 'Modifications enregistrées');
    closeSheet();
  };
  const del = () => {
    update((s) => ({ ...s, items: s.items.filter((x) => x.id !== item.id) }));
    notify(`${item.name} supprimé`);
    closeSheet();
  };
  return (
    <Sheet open={open} onClose={closeSheet} title={isNew ? 'Nouvelle ligne' : 'Modifier'}>
      <form onSubmit={save}>
        <Field label="Catégorie">
          <div className="grid grid-cols-2 gap-2">
            {CAT_ORDER.map((c) => (
              <button type="button" key={c} onClick={() => setF({ ...f, cat: c, rec: c === 'dette' ? 'ponctuel' : f.rec })}
                className={`min-h-[46px] rounded-xl border px-3 text-[14px] text-left font-medium ${f.cat === c ? 'border-accent bg-accent/10 text-fg' : 'border-line bg-card2 text-muted'}`}>
                <span className="inline-block h-2 w-2 rounded-full mr-2" style={{ background: CATS[c].color }} />{CATS[c].label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Libellé"><input id="it-name" value={f.name || ''} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex : Salle de sport" className="input w-full" /></Field>
        <Field label="Montant (€)"><input id="it-amount" inputMode="decimal" value={f.amount || ''} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="0,00" className="input num w-full font-semibold" /></Field>
        <Field label="Fréquence">
          <Segmented value={f.rec} onChange={(v) => setF({ ...f, rec: v })} options={[{ value: 'mensuel', label: 'Chaque mois' }, { value: 'ponctuel', label: 'Ponctuel' }]} />
        </Field>
        {f.rec === 'ponctuel' && (
          <Field label="Mois concerné"><MonthSelect id="it-month" value={f.month} onChange={(v) => setF({ ...f, month: v })} months={months} labelFn={monthLabel} /></Field>
        )}
        {env ? (
          <Field label="Ce qui n'est pas dépensé" hint={f.rollover === 'next' ? 'Le reste passe sur la semaine suivante, puis sur le mois suivant à la clôture.' : 'Le reste est compté comme épargné à la clôture du mois.'}>
            <Segmented value={f.rollover} onChange={(v) => setF({ ...f, rollover: v })} options={[{ value: 'save', label: "Vers l'épargne" }, { value: 'next', label: 'Reporter' }]} />
          </Field>
        ) : (
          <Field label={f.cat === 'revenu' ? 'Jour de versement' : "Jour d'échéance"} hint="Sert au compte à rebours sur l'accueil.">
            <select id="it-day" value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} className="input w-full">
              <option value="">Sans date</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>Le {d}{d === 1 ? 'er' : ''} du mois</option>)}
            </select>
          </Field>
        )}
        <PrimaryBtn type="submit" disabled={!f.name?.trim() || !val}>{isNew ? 'Ajouter' : 'Enregistrer'}</PrimaryBtn>
        {!isNew && <ConfirmDelete label="Supprimer cette ligne" onConfirm={del} />}
      </form>
    </Sheet>
  );
}

/* ---------- Cagnotte ---------- */
export function PotSheet() {
  const { state, update, notify, sheet, closeSheet } = useApp();
  const open = sheet?.type === 'pot';
  const pot = sheet?.data;
  const isNew = !pot?.id;
  const [f, setF] = useState({});
  useEffect(() => {
    if (open) setF({ name: pot.name || '', pct: pot.pct ?? 10, target: toInput(pot.target), deadline: pot.deadline || '', initial: toInput(pot.initial) });
  }, [open]); // eslint-disable-line
  const months = monthRange(state.settings.startMonth, 60);
  const save = (e) => {
    e.preventDefault();
    if (!f.name?.trim()) return;
    const data = { name: f.name.trim(), pct: Number(f.pct) || 0, target: parseAmount(f.target) || null, deadline: f.deadline || null, initial: parseAmount(f.initial) };
    update((s) => ({ ...s, pots: isNew ? [...s.pots, { id: uid(), ...data }] : s.pots.map((x) => (x.id === pot.id ? { ...x, ...data } : x)) }));
    notify(isNew ? 'Cagnotte créée' : 'Cagnotte mise à jour');
    closeSheet();
  };
  return (
    <Sheet open={open} onClose={closeSheet} title={isNew ? 'Nouvelle cagnotte' : 'Cagnotte'}>
      <form onSubmit={save}>
        <Field label="Nom"><input id="pot-name" value={f.name || ''} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex : Voyage au Japon" className="input w-full" /></Field>
        <Field label={`Part de l'épargne mensuelle : ${f.pct ?? 0} %`}>
          <input id="pot-pct" type="range" min="0" max="100" step="5" value={f.pct ?? 0} onChange={(e) => setF({ ...f, pct: Number(e.target.value) })} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Objectif (€)"><input id="pot-target" inputMode="decimal" value={f.target || ''} onChange={(e) => setF({ ...f, target: e.target.value })} placeholder="Facultatif" className="input num w-full" /></Field>
          <Field label="Déjà de côté (€)"><input id="pot-initial" inputMode="decimal" value={f.initial || ''} onChange={(e) => setF({ ...f, initial: e.target.value })} placeholder="0" className="input num w-full" /></Field>
        </div>
        <Field label="Pour quand ?" hint="Avec une date, l'appli calcule ce qu'il faut mettre de côté chaque mois.">
          <MonthSelect id="pot-deadline" value={f.deadline} onChange={(v) => setF({ ...f, deadline: v || '' })} months={months} labelFn={monthLabel} allowEmpty emptyLabel="Pas de date" />
        </Field>
        <PrimaryBtn type="submit" disabled={!f.name?.trim()}>{isNew ? 'Créer' : 'Enregistrer'}</PrimaryBtn>
        {!isNew && <ConfirmDelete label="Supprimer la cagnotte" onConfirm={() => { update((s) => ({ ...s, pots: s.pots.filter((x) => x.id !== pot.id) })); notify('Cagnotte supprimée'); closeSheet(); }} />}
      </form>
    </Sheet>
  );
}

/* ---------- Compte d'épargne ---------- */
const PRESETS = [
  { kind: 'livret-a', name: 'Livret A', rate: LIVRET_A_RATE },
  { kind: 'ldds', name: 'LDDS', rate: LIVRET_A_RATE },
  { kind: 'livret', name: 'Livret bancaire', rate: 0 },
  { kind: 'epargne', name: 'Épargne libre', rate: 0 },
];
export function AccountSheet() {
  const { state, update, notify, sheet, closeSheet } = useApp();
  const open = sheet?.type === 'account';
  const acc = sheet?.data;
  const isNew = !acc?.id;
  const [f, setF] = useState({});
  useEffect(() => {
    if (open) setF({ name: acc.name || '', kind: acc.kind || 'livret-a', balance: toInput(acc.balance ?? ''), rate: toInput(acc.rate ?? (isNew ? LIVRET_A_RATE : 0)), share: acc.share ?? (isNew ? 0 : 100) });
  }, [open]); // eslint-disable-line
  const save = (e) => {
    e.preventDefault();
    if (!f.name?.trim()) return;
    const data = { name: f.name.trim(), kind: f.kind, balance: parseAmount(f.balance), rate: parseAmount(f.rate), share: Number(f.share) || 0 };
    update((s) => ({ ...s, accounts: isNew ? [...s.accounts, { id: uid(), ...data }] : s.accounts.map((x) => (x.id === acc.id ? { ...x, ...data } : x)) }));
    notify(isNew ? 'Compte ajouté' : 'Compte mis à jour');
    closeSheet();
  };
  return (
    <Sheet open={open} onClose={closeSheet} title={isNew ? 'Nouveau compte' : 'Compte'}>
      <form onSubmit={save}>
        {isNew && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button type="button" key={p.kind} onClick={() => setF({ ...f, kind: p.kind, name: p.name, rate: toInput(p.rate) })}
                className={`min-h-[52px] rounded-xl border px-3 text-left ${f.kind === p.kind ? 'border-accent bg-accent/10' : 'border-line bg-card2'}`}>
                <div className="text-[14px] font-semibold">{p.name}</div><div className="text-[12px] text-muted num">{p.rate ? `${toInput(p.rate)} %` : 'Sans intérêts'}</div>
              </button>
            ))}
          </div>
        )}
        <Field label="Nom"><input id="acc-name" value={f.name || ''} onChange={(e) => setF({ ...f, name: e.target.value })} className="input w-full" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={`Solde début ${monthLabel(state.settings.startMonth).toLowerCase()}`}><input id="acc-balance" inputMode="decimal" value={f.balance || ''} onChange={(e) => setF({ ...f, balance: e.target.value })} placeholder="0" className="input num w-full" /></Field>
          <Field label="Taux annuel (%)"><input id="acc-rate" inputMode="decimal" value={f.rate || ''} onChange={(e) => setF({ ...f, rate: e.target.value })} placeholder="0" className="input num w-full" /></Field>
        </div>
        <Field label={`Part de l'épargne versée ici : ${f.share ?? 0} %`} hint="Les parts de tous les comptes sont ramenées à 100 % automatiquement.">
          <input id="acc-share" type="range" min="0" max="100" step="5" value={f.share ?? 0} onChange={(e) => setF({ ...f, share: Number(e.target.value) })} />
        </Field>
        <PrimaryBtn type="submit" disabled={!f.name?.trim()}>{isNew ? 'Ajouter' : 'Enregistrer'}</PrimaryBtn>
        {!isNew && state.accounts.length > 1 && <ConfirmDelete label="Supprimer le compte" onConfirm={() => { update((s) => ({ ...s, accounts: s.accounts.filter((x) => x.id !== acc.id) })); notify('Compte supprimé'); closeSheet(); }} />}
      </form>
    </Sheet>
  );
}

/* ---------- Clôture du mois ---------- */
export function CloseSheet() {
  const { state, update, notify, sheet, closeSheet } = useApp();
  const open = sheet?.type === 'close';
  const key = sheet?.data?.key;
  const [assume, setAssume] = useState(true);
  useEffect(() => { if (open) setAssume(true); }, [open]);
  if (!open || !key) return null;
  const snap = buildClosing(state, key, { assumeUnpaid: assume });
  const names = new Map(state.items.map((i) => [i.id, i]));
  const unpaid = state.items.filter((i) => snap.assumed.includes(i.id) || (!assume && i.cat !== 'revenu' && !isEnvelope(i) && (i.rec === 'mensuel' || i.month === key) && !state.paid[`${key}:${i.id}`]));
  const sh = shares(state.accounts);
  const confirm = () => {
    update((s) => ({ ...s, months: { ...s.months, [key]: snap } }));
    if (snap.saved > 0) confetti({ y: window.innerHeight * 0.4, count: 110, power: 1.5, spread: 1.7 });
    notify(snap.saved > 0 ? `${monthLabel(key)} clôturé : +${eur(snap.saved, 0)} épargnés !` : `${monthLabel(key)} clôturé`, snap.saved > 0 ? 'party' : 'info');
    closeSheet();
  };
  const diff = snap.saved - snap.planned.saved;
  return (
    <Sheet open={open} onClose={closeSheet} title={`Clôturer ${monthLabel(key).toLowerCase()}`}>
      <div className="applecard p-4 mb-4">
        <div className="text-[13px] text-muted">Épargné ce mois</div>
        <AnimatedNumber value={snap.saved} format={(v) => eur(v)} className={`num block text-[36px] font-extrabold leading-none mt-1 ${snap.saved < 0 ? 'text-bad' : ''}`} />
        <div className={`num mt-1 text-[13px] ${diff >= 0 ? 'text-good' : 'text-bad'}`}>{diff >= 0 ? '+' : ''}{eur(diff)} par rapport au prévu ({eur(snap.planned.saved)})</div>
      </div>
      <div className="card divide-y divide-line mb-4 text-[15px]">
        <div className="flex justify-between px-4 py-3"><span className="text-muted">Revenus reçus</span><span className="num font-semibold">{eur(snap.income)}</span></div>
        <div className="flex justify-between px-4 py-3"><span className="text-muted">Dépenses</span><span className="num font-semibold">{eur(snap.spent)}</span></div>
        {snap.carryOut > 0 && <div className="flex justify-between px-4 py-3"><span className="text-muted">Reporté au mois suivant</span><span className="num font-semibold">{eur(snap.carryOut)}</span></div>}
      </div>
      {snap.envelopes.length > 0 && (
        <div className="card divide-y divide-line mb-4">
          {snap.envelopes.map((e) => (
            <div key={e.id} className="px-4 py-3 flex items-center justify-between gap-2">
              <div className="min-w-0"><div className="text-[15px] truncate">{names.get(e.id)?.name}</div><div className="num text-[12px] text-faint">{eur(e.spent)} / {eur(e.budget)}</div></div>
              <div className={`num text-[14px] font-semibold ${e.unspent < 0 ? 'text-bad' : 'text-good'}`}>{e.unspent >= 0 ? `+${eur(e.unspent)}` : eur(e.unspent)}<span className="block text-[11px] text-faint font-normal text-right">{e.rollover === 'next' ? 'reporté' : 'épargne'}</span></div>
            </div>
          ))}
        </div>
      )}
      {unpaid.length > 0 && (
        <div className="mb-4 rounded-2xl border border-warn/30 bg-warn/10 p-4">
          <div className="text-[14px] text-warn font-semibold mb-1">{unpaid.length} échéance{unpaid.length > 1 ? 's' : ''} non cochée{unpaid.length > 1 ? 's' : ''}</div>
          <div className="text-[13px] text-muted mb-3">{unpaid.map((u) => u.name).join(', ')}</div>
          <Segmented value={assume ? 'yes' : 'no'} onChange={(v) => setAssume(v === 'yes')} options={[{ value: 'yes', label: 'Compter payées' }, { value: 'no', label: 'Ignorer' }]} />
        </div>
      )}
      {snap.missingIncomes.length > 0 && (
        <div className="mb-4 rounded-2xl border border-line p-4 text-[13px] text-muted">
          Non reçu, donc non compté : {snap.missingIncomes.map((id) => names.get(id)?.name).join(', ')}. Coche-le dans les échéances s'il est arrivé.
        </div>
      )}
      {state.accounts.length > 1 && snap.saved > 0 && (
        <div className="mb-4 text-[13px] text-muted px-1">Réparti : {state.accounts.map((a, i) => `${a.name} ${eur(snap.saved * sh[i], 0)}`).join(' · ')}</div>
      )}
      <PrimaryBtn onClick={confirm}><Lock size={18} /> Clôturer le mois</PrimaryBtn>
      <p className="mt-2 text-[12px] text-faint text-center">Tu pourras rouvrir ce mois tant que le suivant n'est pas clôturé.</p>
    </Sheet>
  );
}

export function AllSheets() {
  return (<><ExpenseSheet /><ExpensesListSheet /><ItemSheet /><PotSheet /><AccountSheet /><CloseSheet /></>);
}
