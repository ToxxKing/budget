import { useEffect, useState } from 'react';
import { Trophy, Target } from 'lucide-react';
import { useApp } from '../lib/store';
import { currentCapital, potValue } from '../lib/engine';
import { eur } from '../lib/format';
import { confetti } from '../lib/fx';

const PALIERS = [{ v: 3000, name: 'Palier 1' }, { v: 5000, name: 'Palier 2' }, { v: 10000, name: 'Objectif principal' }];

/**
 * Plein écran festif la première fois qu'un palier d'épargne ou l'objectif d'une cagnotte est atteint
 * (le capital réel avance à chaque clôture de mois). Chaque victoire n'est fêtée qu'une fois.
 */
export function Celebration() {
  const { state, updateMeta } = useApp();
  const [win, setWin] = useState(null);

  useEffect(() => {
    if (!state || win) return;
    const done = new Set(state.meta.celebrated || []);
    const cap = currentCapital(state);
    const palier = PALIERS.find((p) => cap >= p.v && !done.has(`palier-${p.v}`));
    if (palier) { setWin({ id: `palier-${palier.v}`, icon: Trophy, title: `${palier.name} atteint !`, amount: palier.v, sub: `Ton capital réel est de ${eur(cap, 0)}.` }); return; }
    const pot = state.pots.find((p) => p.target && potValue(state, p) >= p.target && !done.has(`pot-${p.id}`));
    if (pot) setWin({ id: `pot-${pot.id}`, icon: Target, title: `${pot.name} : objectif atteint !`, amount: pot.target, sub: 'Cette cagnotte est remplie.' });
  }, [state, win]);

  useEffect(() => {
    if (!win) return;
    confetti({ y: window.innerHeight * 0.45, count: 140, power: 1.7, spread: 1.8 });
    const t = setTimeout(() => confetti({ x: window.innerWidth * 0.2, y: window.innerHeight * 0.6, count: 60, power: 1.2 }), 350);
    const t2 = setTimeout(() => confetti({ x: window.innerWidth * 0.8, y: window.innerHeight * 0.6, count: 60, power: 1.2 }), 650);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [win]);

  if (!win) return null;
  const Icon = win.icon;
  const close = () => { updateMeta({ celebrated: [...(state.meta.celebrated || []), win.id] }); setWin(null); };
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 backdrop-blur-md anim-fade gutter" role="dialog" aria-modal="true" aria-label={win.title} onClick={close}>
      <div className="celeb-in applecard warm w-full max-w-[360px] p-7 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="floaty mx-auto mb-4 h-20 w-20 rounded-[26px] grid place-items-center" style={{ background: 'linear-gradient(140deg,#ffc24b,#ff7ab8)' }}>
          <Icon size={40} strokeWidth={2.2} className="text-[#1a1020]" />
        </div>
        <h2 className="text-[24px] font-extrabold tracking-tight">{win.title}</h2>
        <div className="num mt-2 text-[44px] font-extrabold leading-none">{eur(win.amount)}</div>
        <p className="mt-3 text-[15px] text-muted">{win.sub}</p>
        <button onClick={close} className="press mt-6 min-h-[52px] w-full rounded-2xl bg-fg text-bg font-bold text-[17px]">Trop bien !</button>
      </div>
    </div>
  );
}
