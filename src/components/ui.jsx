import { useEffect, useRef, useState } from 'react';
import { useMounted } from './motion';
import { X, Trash2 } from 'lucide-react';

export function Sheet({ open, onClose, title, children, full = false }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center anim-fade" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[6px]" onClick={onClose} />
      <div className={`anim-up relative w-full max-w-[520px] rounded-t-[28px] border-t border-line bg-card overflow-y-auto overscroll-contain sheet-pad ${full ? 'h-[92vh]' : 'max-h-[90vh]'}`}>
        <div className="mx-auto mt-2 mb-3 h-1.5 w-10 rounded-full bg-line2" />
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="text-[20px] font-bold tracking-tight">{title}</h2>
          <button onClick={onClose} className="tap grid place-items-center rounded-full bg-card2 text-muted shrink-0" aria-label="Fermer"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const Field = ({ label, hint, children }) => (
  <label className="block mb-3">
    <span className="block text-[13px] text-muted mb-1.5 font-medium">{label}</span>
    {children}
    {hint && <span className="block text-[12px] text-faint mt-1">{hint}</span>}
  </label>
);

export const PrimaryBtn = ({ children, className = '', ...p }) => (
  <button {...p} className={`press min-h-[52px] w-full rounded-2xl bg-accent text-accent-ink font-semibold text-[17px] flex items-center justify-center gap-2 active:scale-[.98] transition disabled:opacity-40 ${className}`}>{children}</button>
);
export const GhostBtn = ({ children, className = '', ...p }) => (
  <button {...p} className={`press min-h-[48px] rounded-2xl bg-card2 border border-line font-medium text-[15px] flex items-center justify-center gap-2 px-4 active:scale-[.98] transition disabled:opacity-40 ${className}`}>{children}</button>
);
export const DangerBtn = ({ children, className = '', ...p }) => (
  <button {...p} className={`min-h-[48px] rounded-2xl bg-bad text-black font-semibold text-[15px] flex items-center justify-center gap-2 px-4 active:scale-[.98] transition ${className}`}>{children}</button>
);

export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`grid gap-1 rounded-xl bg-card2 border border-line p-1 ${className}`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }} role="tablist">
      {options.map((o) => (
        <button type="button" key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={`min-h-[44px] rounded-lg px-2 text-[14px] font-medium leading-tight transition ${value === o.value ? 'bg-line text-fg' : 'text-muted'}`}>
          {o.label}{o.sub && <span className="block text-[11px] opacity-70 font-normal">{o.sub}</span>}
        </button>
      ))}
    </div>
  );
}

export function Bar({ value, max, color, height = 10 }) {
  const mounted = useMounted();
  const p = max > 0 ? Math.min(100, (value / max) * 100) : value > 0 ? 100 : 0;
  const c = value > max ? 'var(--bad)' : color || (p >= 80 ? 'var(--warn)' : 'var(--accent)');
  return (
    <div className="w-full rounded-full bg-line overflow-hidden" style={{ height }}>
      <div className="bar-fill h-full rounded-full" style={{ width: `${mounted ? p : 0}%`, background: c }} />
    </div>
  );
}

export function PageTitle({ eyebrow, title, right }) {
  return (
    <header className="mb-4 flex items-end justify-between gap-3 pt-2">
      <div className="min-w-0">
        <div className="label mb-1 capitalize-first">{eyebrow}</div>
        <h1 className="text-[34px] leading-[1.05] font-extrabold tracking-tight">{title}</h1>
      </div>
      {right}
    </header>
  );
}

export const SectionTitle = ({ children, right }) => (
  <div className="flex items-end justify-between gap-3 mb-2.5 mt-1">
    <h2 className="text-[20px] font-bold tracking-tight">{children}</h2>
    {right && <div className="text-[13px] text-muted num">{right}</div>}
  </div>
);

export const Chip = ({ tone = 'neutral', children, className = '' }) => {
  const tones = {
    neutral: 'bg-line text-muted', good: 'bg-good/15 text-good', warn: 'bg-warn/15 text-warn',
    bad: 'bg-bad/15 text-bad', accent: 'bg-accent/15 text-accent',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap ${tones[tone]} ${className}`}>{children}</span>;
};

export const CatIcon = ({ icon: Icon, color, size = 40 }) => (
  <div className="rounded-xl grid place-items-center shrink-0" style={{ width: size, height: size, background: color + '22', color }}>
    <Icon size={Math.round(size / 2)} />
  </div>
);

/** Ligne glissable : vers la gauche pour révéler « Supprimer ». Un simple toucher déclenche onTap. */
export function SwipeRow({ children, onTap, onDelete }) {
  const [dx, setDx] = useState(0);
  const start = useRef(null);
  const moved = useRef(false);
  const W = 96;
  return (
    <div className="relative overflow-hidden">
      <button type="button" onClick={() => { setDx(0); onDelete(); }} tabIndex={dx ? 0 : -1}
        className="absolute right-0 inset-y-0 w-[96px] bg-bad text-black font-semibold flex flex-col items-center justify-center gap-0.5" aria-label="Supprimer">
        <Trash2 size={18} /><span className="text-[12px]">Supprimer</span>
      </button>
      <div
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') onTap?.(); if (e.key === 'Delete' || e.key === 'Backspace') onDelete(); }}
        onTouchStart={(e) => { start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, base: dx }; moved.current = false; }}
        onTouchMove={(e) => {
          if (!start.current) return;
          const ddx = e.touches[0].clientX - start.current.x;
          const ddy = e.touches[0].clientY - start.current.y;
          if (Math.abs(ddx) > 8 && Math.abs(ddx) > Math.abs(ddy)) { moved.current = true; setDx(Math.max(-W, Math.min(0, start.current.base + ddx))); }
        }}
        onTouchEnd={() => { if (moved.current) setDx((d) => (d < -W / 2 ? -W : 0)); start.current = null; }}
        onClick={() => { if (moved.current) return; if (dx !== 0) { setDx(0); return; } onTap?.(); }}
        className="relative bg-card transition-transform duration-200 cursor-pointer"
        style={{ transform: `translateX(${dx}px)` }}>
        {children}
      </div>
    </div>
  );
}

export function MonthSelect({ id, value, onChange, months, labelFn, allowEmpty, emptyLabel = 'Aucun' }) {
  return (
    <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} className="input w-full">
      {allowEmpty && <option value="">{emptyLabel}</option>}
      {months.map((m) => <option key={m} value={m}>{labelFn(m)}</option>)}
    </select>
  );
}
