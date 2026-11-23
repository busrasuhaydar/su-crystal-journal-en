// Fareyle sayfa geçişi: sağ/sol alt köşeyi tut-sürükle ya da tıkla (sonraki/önceki bölüm, defter sırası),
// izleme panelinde iki parmakla yatay kaydırma, farenin geri/ileri yan tuşları (tarayıcı geçmişi).
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NAV, isActive } from './Nav';

const blocked = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  if (!el?.closest) return true;
  if (document.querySelector('.cr-scrim, .lb, .dialog, .cmdk')) return true;
  if (el.closest('input, textarea, select, [contenteditable="true"], .zs, .tg')) return true;
  // yatay kayan bir öğenin içindeyse (sekmeler, galeri şeridi) ona bırak
  for (let n: HTMLElement | null = el; n && n !== document.body; n = n.parentElement) {
    if (n.scrollWidth > n.clientWidth + 2) { const ox = getComputedStyle(n).overflowX; if (ox === 'auto' || ox === 'scroll') return true; }
  }
  return false;
};

export function PageCorners() {
  const loc = useLocation();
  const nav = useNavigate();
  const idx = NAV.findIndex((n) => isActive(loc.pathname, n));
  const prev = idx > 0 ? NAV[idx - 1] : null;
  const next = idx >= 0 && idx < NAV.length - 1 ? NAV[idx + 1] : null;
  const go = useRef<(d: 1 | -1) => void>(() => {});
  go.current = (d) => { const t = d > 0 ? next : prev; if (t) nav(t.to); };

  useEffect(() => {
    let acc = 0, last = 0, until = 0;
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) < Math.abs(e.deltaY) * 1.6) return;
      const now = performance.now();
      if (now < until || blocked(e.target)) return;
      if (now - last > 220) acc = 0;
      last = now; acc += e.deltaX;
      if (Math.abs(acc) > 150) { until = now + 1000; const d = acc > 0 ? 1 : -1; acc = 0; go.current(d); }
    };
    // farenin yan tuşları: 3 = geri, 4 = ileri (Safari dahil her tarayıcıda; çift gitmesin diye varsayılan engellenir)
    const side = (e: MouseEvent) => { if (e.button === 3 || e.button === 4) { e.preventDefault(); if (e.type === 'mouseup') e.button === 3 ? history.back() : history.forward(); } };
    addEventListener('wheel', wheel, { passive: true });
    addEventListener('mousedown', side); addEventListener('mouseup', side);
    return () => { removeEventListener('wheel', wheel); removeEventListener('mousedown', side); removeEventListener('mouseup', side); };
  }, []);

  return <>
    {prev && <Corner dir={-1} label={prev.label} onGo={() => go.current(-1)} />}
    {next && <Corner dir={1} label={next.label} onGo={() => go.current(1)} />}
  </>;
}

function Corner({ dir, label, onGo }: { dir: 1 | -1; label: string; onGo: () => void }) {
  const st = useRef<{ x: number; y: number; moved: number } | null>(null);
  const down = (e: React.PointerEvent<HTMLButtonElement>) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* yok */ }
    st.current = { x: e.clientX, y: e.clientY, moved: 0 };
    e.currentTarget.classList.add('drag');
  };
  const move = (e: React.PointerEvent<HTMLButtonElement>) => {
    const s = st.current; if (!s) return;
    const pull = Math.max(0, (s.x - e.clientX) * dir) + Math.max(0, s.y - e.clientY) * 0.5;
    s.moved = Math.max(s.moved, Math.abs(e.clientX - s.x) + Math.abs(e.clientY - s.y));
    e.currentTarget.style.setProperty('--peel', `${Math.min(220, 40 + pull)}px`);
  };
  const up = (e: React.PointerEvent<HTMLButtonElement>) => {
    const s = st.current; st.current = null;
    const b = e.currentTarget; b.classList.remove('drag'); b.style.removeProperty('--peel');
    if (!s) return;
    const pull = (s.x - e.clientX) * dir;
    if (s.moved < 6 || pull > 60) onGo();
  };
  return (
    <button type="button" className={`cb-corner ${dir > 0 ? 'next' : 'prev'}`} aria-label={`${dir > 0 ? 'Next' : 'Previous'}page: ${label}`} title={label}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <span className="tip">{dir < 0 && <ChevronLeft size={12} />}{label}{dir > 0 && <ChevronRight size={12} />}</span>
    </button>
  );
}
