/**
 * Petits effets visuels sans dépendance : confettis sur canvas (~1 Ko).
 * Désactivés si l'utilisateur a demandé moins d'animations dans iOS (Accessibilité → Mouvement).
 */
const COLORS = ['#8fa8ff', '#3ee0a1', '#ff7ab8', '#ffc24b', '#5ee0ff', '#ff8a5c', '#c4a1ff'];
export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function confetti({ x = window.innerWidth / 2, y = window.innerHeight / 2, count = 28, spread = 1, power = 1 } = {}) {
  if (reducedMotion()) return;
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = window.innerWidth * dpr;
  c.height = window.innerHeight * dpr;
  Object.assign(c.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 80 });
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  const parts = Array.from({ length: count }, () => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * spread;
    const v = (4 + Math.random() * 6) * power;
    return {
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      w: 5 + Math.random() * 5, h: 3 + Math.random() * 4,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
      color: COLORS[(Math.random() * COLORS.length) | 0], round: Math.random() < 0.3,
    };
  });
  const start = performance.now();
  const D = 1300;
  function frame(t) {
    const k = (t - start) / D;
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of parts) {
      p.vy += 0.28; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - k * k);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.color;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.h / 1.4, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (k < 1) requestAnimationFrame(frame); else c.remove();
  }
  requestAnimationFrame(frame);
}

/** Confettis partant du centre d'un élément (bouton cliqué). */
export function confettiFrom(el, opts) {
  const r = el?.getBoundingClientRect?.();
  if (!r) return confetti(opts);
  confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, ...opts });
}

/** Petite vibration quand l'appareil la permet (Android ; ignoré sur iPhone). */
export const tick = () => { try { navigator.vibrate?.(8); } catch (e) { /* rien */ } };
