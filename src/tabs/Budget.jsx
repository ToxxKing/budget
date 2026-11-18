import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { useApp } from '../lib/store';
import { CATS, CAT_ORDER } from '../lib/defaults';
import { CAT_ICONS } from '../components/icons';
import { eur } from '../lib/format';
import { monthLabel } from '../lib/dates';
import { isEnvelope, standardMonth } from '../lib/engine';
import { CatIcon, PageTitle, SwipeRow } from '../components/ui';

function subtitle(it) {
  const parts = [it.rec === 'mensuel' ? 'Chaque mois' : `Ponctuel · ${monthLabel(it.month)}`];
  if (isEnvelope(it)) parts.push(it.rollover === 'next' ? 'reste reporté' : 'reste épargné');
  else if (it.day) parts.push(`le ${it.day}`);
  return parts.join(' · ');
}

export default function Budget({ goSettings }) {
  const { state, update, notify, openSheet } = useApp();
  const [open, setOpen] = useState({ fixe: true, vie: true, shopping: false, dette: true, revenu: false });
  const std = standardMonth(state);
  const del = (it) => { update((s) => ({ ...s, items: s.items.filter((x) => x.id !== it.id) })); notify(`${it.name} supprimé`); };

  return (
    <div>
      <PageTitle eyebrow="Gestionnaire" title="Budget" />
      <section className="card p-4 mb-4 grid grid-cols-3 gap-2 text-center">
        <button onClick={goSettings} className="min-h-[44px] rounded-xl">
          <div className="text-[12px] text-muted">Salaire net</div><div className="num font-bold text-[17px]">{eur(state.settings.salary)}</div>
        </button>
        <div><div className="text-[12px] text-muted">Dépenses / mois</div><div className="num font-bold text-[17px]">{eur(std.expenses)}</div></div>
        <div><div className="text-[12px] text-muted">Surplus type</div><div className={`num font-bold text-[17px] ${std.saved >= 0 ? 'text-good' : 'text-bad'}`}>{eur(std.saved)}</div></div>
      </section>

      <div className="space-y-3">
        {CAT_ORDER.map((c) => {
          const items = state.items.filter((i) => i.cat === c);
          const total = items.reduce((a, i) => a + i.amount, 0);
          const on = open[c];
          return (
            <section key={c} className="card overflow-hidden">
              <button onClick={() => setOpen({ ...open, [c]: !on })} className="w-full min-h-[64px] flex items-center gap-3 px-4" aria-expanded={on}>
                <CatIcon icon={CAT_ICONS[c]} color={CATS[c].color} size={36} />
                <div className="flex-1 text-left"><div className="text-[16px] font-semibold">{CATS[c].label}</div><div className="text-[12px] text-faint">{items.length} ligne{items.length > 1 ? 's' : ''}</div></div>
                <div className={`num font-bold ${c === 'revenu' ? 'text-good' : ''}`}>{c === 'revenu' ? '+' : ''}{eur(total)}</div>
                <ChevronDown size={18} className={`text-faint transition ${on ? 'rotate-180' : ''}`} />
              </button>
              {on && (
                <div className="border-t border-line divide-y divide-line">
                  {items.map((it) => (
                    <SwipeRow key={it.id} onTap={() => openSheet('item', it)} onDelete={() => del(it)}>
                      <div className="flex items-center gap-3 px-4 min-h-[58px]">
                        <div className="min-w-0 flex-1"><div className="text-[15px] truncate">{it.name}</div><div className="text-[12px] text-faint truncate">{subtitle(it)}</div></div>
                        <div className="num font-semibold">{eur(it.amount)}</div>
                      </div>
                    </SwipeRow>
                  ))}
                  {items.length === 0 && <div className="px-4 py-3 text-[14px] text-faint">Vide pour l'instant.</div>}
                  <button onClick={() => openSheet('item', { cat: c })} className="w-full min-h-[48px] flex items-center gap-2 px-4 text-[15px] text-accent"><Plus size={18} /> Ajouter</button>
                </div>
              )}
            </section>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] text-faint px-1">Touche une ligne pour la modifier, glisse-la vers la gauche pour la supprimer.</p>

      <button onClick={() => openSheet('item', {})} aria-label="Ajouter une ligne" className="fab"><Plus size={28} strokeWidth={2.5} /></button>
    </div>
  );
}
