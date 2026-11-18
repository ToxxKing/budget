import { useRef, useState } from 'react';
import { eur } from '../lib/format';
import { monthLabel, monthShort } from '../lib/dates';

/* Graphiques en SVG fait main : ~3 Ko au lieu de ~400 Ko pour une librairie, et un contrôle total du toucher. */

export function Donut({ data, total }) {
  const [sel, setSel] = useState(null);
  const R = 70;
  const C = 2 * Math.PI * R;
  let acc = 0;
  const s = sel != null ? data[sel] : null;
  const share = (v) => (total > 0 ? Math.round((v / total) * 100) : 0);
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 200" className="w-[220px] h-[220px]" role="img" aria-label="Répartition des dépenses">
        <circle cx="100" cy="100" r={R} fill="none" stroke="var(--line)" strokeWidth="26" />
        {data.map((d, i) => {
          const len = total > 0 ? (d.value / total) * C : 0;
          const off = acc;
          acc += len;
          return (
            <circle key={d.key} cx="100" cy="100" r={R} fill="none" stroke={d.color} strokeWidth={sel === i ? 34 : 26}
              strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-off} transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-width .2s, opacity .2s', cursor: 'pointer', opacity: sel == null || sel === i ? 1 : 0.3 }}
              onClick={() => setSel(sel === i ? null : i)} />
          );
        })}
        <text x="100" y="94" textAnchor="middle" fill="var(--muted)" fontSize="11">{s ? s.label : 'Total'}</text>
        <text x="100" y="116" textAnchor="middle" fill="var(--fg)" fontSize="20" fontWeight="700">{eur(s ? s.value : total)}</text>
        {s && <text x="100" y="134" textAnchor="middle" fill={s.color} fontSize="11" fontWeight="600">{share(s.value)} %</text>}
      </svg>
      <div className="mt-3 grid w-full grid-cols-2 gap-2">
        {data.map((d, i) => (
          <button key={d.key} onClick={() => setSel(sel === i ? null : i)}
            className={`min-h-[52px] rounded-xl border px-3 text-left transition ${sel === i ? 'border-line2 bg-card2' : 'border-line'}`}>
            <div className="flex items-center gap-2 text-[13px] text-muted"><span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />{d.label}</div>
            <div className="num text-[15px] font-semibold">{eur(d.value)} <span className="text-[12px] text-faint font-normal">{share(d.value)} %</span></div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function LineChart({ base, sim, marks = [3000, 5000, 10000] }) {
  const W = 340, H = 220, P = { l: 40, r: 10, t: 12, b: 26 };
  const all = [...base, ...(sim || [])].map((d) => d.capital);
  const maxV = Math.max(marks[marks.length - 1], ...all) * 1.05;
  const minV = Math.min(0, ...all);
  const n = base.length;
  const x = (i) => P.l + (n > 1 ? i / (n - 1) : 0) * (W - P.l - P.r);
  const y = (v) => P.t + (1 - (v - minV) / (maxV - minV)) * (H - P.t - P.b);
  const path = (arr) => arr.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.capital).toFixed(1)}`).join(' ');
  const zero = y(Math.max(minV, 0));
  const area = `${path(base)} L${x(n - 1)},${zero} L${x(0)},${zero} Z`;
  const step = maxV > 20000 ? 10000 : maxV > 10000 ? 5000 : 2500;
  const ticks = [];
  for (let t = 0; t <= maxV; t += step) ticks.push(t);
  const lastClosed = base.reduce((acc, d, i) => (d.closed ? i : acc), -1);
  const [hover, setHover] = useState(null);
  const ref = useRef(null);
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const cx = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) * (W / r.width);
    const i = Math.round(((cx - P.l) / (W - P.l - P.r)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const h = hover != null ? base[hover] : null;
  return (
    <div>
      <div className="num mb-1 h-[42px] text-[13px]">
        {h ? (
          <>
            <div className="text-muted">{monthLabel(h.key)} · {h.closed ? 'réel' : 'prévu'}</div>
            <div className="text-[17px] font-bold">{eur(h.capital, 0)}
              {sim && <span className="text-[13px] text-warn font-semibold ml-2">simulé {eur(sim[hover].capital, 0)}</span>}</div>
          </>
        ) : <div className="text-faint pt-2">Touche la courbe pour lire un mois</div>}
      </div>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto touch-none select-none"
        onMouseMove={onMove} onTouchStart={onMove} onTouchMove={onMove} onMouseLeave={() => setHover(null)} onTouchEnd={() => setTimeout(() => setHover(null), 1800)}
        role="img" aria-label="Projection du capital">
        <defs>
          <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#8fa8ff" stopOpacity=".32" /><stop offset="100%" stopColor="#8fa8ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray={t === 0 ? '0' : '2 4'} />
            <text x={P.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--faint)">{t >= 1000 ? `${t / 1000}k` : t}</text>
          </g>
        ))}
        {marks.map((t) => t <= maxV && (
          <g key={`m${t}`}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="#3f3f46" strokeDasharray="5 4" />
            <text x={W - P.r} y={y(t) - 4} textAnchor="end" fontSize="9.5" fill="var(--muted)">{eur(t)}</text>
          </g>
        ))}
        {lastClosed >= 0 && <rect x={P.l} y={P.t} width={Math.max(0, x(lastClosed) - P.l)} height={H - P.t - P.b} fill="#ffffff" opacity="0.03" />}
        <path d={area} fill="url(#area)" />
        <path d={path(base)} fill="none" stroke="#8fa8ff" strokeWidth="2.5" strokeLinejoin="round" />
        {sim && <path d={path(sim)} fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="5 4" />}
        {base.map((d, i) => d.closed && <circle key={d.key} cx={x(i)} cy={y(d.capital)} r="3" fill="#8fa8ff" />)}
        <circle cx={x(n - 1)} cy={y(base[n - 1].capital)} r="4.5" fill="#8fa8ff" stroke="var(--bg)" strokeWidth="2" />
        {base.map((d, i) => (i % 3 === 0 || i === n - 1) && <text key={`l${d.key}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9.5" fill="var(--faint)">{monthShort(d.key)}</text>)}
        {h && <><line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="#52525b" /><circle cx={x(hover)} cy={y(h.capital)} r="5" fill="#fff" /></>}
      </svg>
    </div>
  );
}

/** Barres horizontales prévu (fond) vs réel (plein) par catégorie. */
export function CompareBars({ rows }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.planned, r.actual]));
  return (
    <div className="space-y-3.5">
      {rows.map((r) => {
        const over = r.actual > r.planned;
        return (
          <div key={r.key}>
            <div className="flex items-baseline justify-between text-[14px] mb-1.5 gap-2">
              <span className="flex items-center gap-2 min-w-0"><span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: r.color }} /><span className="truncate">{r.label}</span></span>
              <span className="num whitespace-nowrap"><span className={`font-semibold ${over ? 'text-bad' : ''}`}>{eur(r.actual)}</span><span className="text-faint"> / {eur(r.planned)}</span></span>
            </div>
            <div className="relative h-3 rounded-full bg-line overflow-hidden">
              <div className="absolute inset-y-0 left-0 rounded-full opacity-35" style={{ width: `${(r.planned / max) * 100}%`, background: r.color }} />
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(Math.min(r.actual, max) / max) * 100}%`, background: over ? 'var(--bad)' : r.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
