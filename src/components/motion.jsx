import { useEffect, useRef, useState } from 'react';
import { reducedMotion } from '../lib/fx';

const ease = (t) => 1 - Math.pow(1 - t, 3);

/** Nombre qui « compte » jusqu'à sa valeur, au montage puis à chaque changement. */
export function AnimatedNumber({ value, format = (v) => String(Math.round(v)), duration = 800, className = '' }) {
  const [shown, setShown] = useState(reducedMotion() ? value : 0);
  const from = useRef(reducedMotion() ? value : 0);
  const raf = useRef(0);
  useEffect(() => {
    if (reducedMotion()) { setShown(value); from.current = value; return; }
    const a = from.current;
    const t0 = performance.now();
    cancelAnimationFrame(raf.current);
    const step = (t) => {
      const k = Math.min(1, (t - t0) / duration);
      const v = a + (value - a) * ease(k);
      setShown(v);
      if (k < 1) raf.current = requestAnimationFrame(step);
      else from.current = value;
    };
    raf.current = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf.current); from.current = value; };
  }, [value, duration]);
  // Arrondi à l'euro pendant l'animation pour éviter le scintillement des centimes
  const settled = Math.abs(shown - value) < 0.005;
  return <span className={className}>{format(settled ? value : Math.round(shown))}</span>;
}

/** Renvoie false au premier rendu puis true : sert à animer une jauge depuis 0. */
export function useMounted(delay = 60) {
  const [m, setM] = useState(false);
  useEffect(() => { const t = setTimeout(() => setM(true), delay); return () => clearTimeout(t); }, [delay]);
  return m;
}

/** Carte qui s'incline sous le doigt, avec un reflet qui suit (façon carte bancaire en main). */
export function TiltCard({ children, className = '', ...rest }) {
  const ref = useRef(null);
  const [t, setT] = useState({ rx: 0, ry: 0, gx: 50, gy: 30, on: false });
  const move = (e) => {
    if (reducedMotion()) return;
    const r = ref.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * 2 - 1;
    const py = ((e.clientY - r.top) / r.height) * 2 - 1;
    setT({ rx: -py * 6, ry: px * 8, gx: ((px + 1) / 2) * 100, gy: ((py + 1) / 2) * 100, on: true });
  };
  const leave = () => setT((s) => ({ ...s, rx: 0, ry: 0, on: false }));
  // Le conteneur extérieur reçoit l'animation d'entrée ; la carte intérieure garde sa propre transformation.
  return (
    <div>
    <section ref={ref} {...rest} onPointerMove={move} onPointerDown={move} onPointerLeave={leave} onPointerUp={leave} onPointerCancel={leave}
      className={`${className} will-change-transform`}
      style={{ transform: `perspective(900px) rotateX(${t.rx}deg) rotateY(${t.ry}deg) scale(${t.on ? 1.015 : 1})`, transition: t.on ? 'transform .08s linear' : 'transform .6s cubic-bezier(.3,1.5,.5,1)' }}>
      {children}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
        style={{ opacity: t.on ? 1 : 0, background: `radial-gradient(60% 50% at ${t.gx}% ${t.gy}%, rgba(255,255,255,.16), transparent 60%)` }} />
    </section>
    </div>
  );
}

/** Jauge circulaire animée */
export function Ring({ value, size = 44, stroke = 5, color = 'var(--good)' }) {
  const mounted = useMounted(120);
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, value));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={C * (1 - (mounted ? p : 0))} style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.3,1.2,.45,1)' }} />
    </svg>
  );
}
