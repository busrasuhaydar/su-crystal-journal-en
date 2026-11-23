// Kristal defter süsleri: kristal kolye, altın kilit, kurdele, cam kanatlı kelebekler, pırıltı, taç yaprakları,
// sayfa kenarı yaprak destesi ve açılış kapağı. Hepsi özgün SVG; animasyonlar yalnız transform/opacity.
import { useEffect, useRef, useState } from 'react';
import { claspUrl, ringUrl } from './chrome';

export const Defs = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="cr-pink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFD3EA" /><stop offset=".45" stopColor="#FF7EC0" /><stop offset="1" stopColor="#E0328F" /></linearGradient>
      <radialGradient id="cr-hole" cx=".5" cy=".4" r=".7"><stop offset="0" stopColor="#1E0A2E" stopOpacity=".92" /><stop offset=".7" stopColor="#3A1450" stopOpacity=".7" /><stop offset="1" stopColor="#5B2A70" stopOpacity=".35" /></radialGradient>
      <linearGradient id="cr-hole-rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2B1038" stopOpacity=".7" /><stop offset=".55" stopColor="#FFFFFF" stopOpacity=".15" /><stop offset="1" stopColor="#FFFFFF" stopOpacity=".95" /></linearGradient>
      <filter id="cr-blur" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="2.2" /></filter>
      <clipPath id="cr-ringclip"><rect x="0" y="0" width="80" height="23.6" /></clipPath>
      <linearGradient id="cr-chrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset=".14" stopColor="#E8F0FA" /><stop offset=".34" stopColor="#A9B7CA" /><stop offset=".47" stopColor="#4A5468" /><stop offset=".52" stopColor="#151B27" /><stop offset=".58" stopColor="#5D6A80" /><stop offset=".74" stopColor="#C4CFDD" /><stop offset=".88" stopColor="#F2E6F7" /><stop offset="1" stopColor="#8F9DB2" /></linearGradient>
      <linearGradient id="cr-chrome-sh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#121A2C" stopOpacity=".55" /><stop offset=".2" stopColor="#121A2C" stopOpacity="0" /><stop offset=".8" stopColor="#121A2C" stopOpacity="0" /><stop offset="1" stopColor="#121A2C" stopOpacity=".5" /></linearGradient>
      <linearGradient id="cr-crystal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset=".3" stopColor="#E3F6FF" /><stop offset=".62" stopColor="#F7D2FF" /><stop offset="1" stopColor="#FFE2EF" /></linearGradient>
      <linearGradient id="cr-wing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFFFFF" stopOpacity=".95" /><stop offset=".45" stopColor="#FFC2E4" stopOpacity=".8" /><stop offset="1" stopColor="#B9A4FF" stopOpacity=".75" /></linearGradient>
      <radialGradient id="cr-petal" cx=".5" cy=".85" r=".9"><stop offset="0" stopColor="#FF8CC6" /><stop offset=".55" stopColor="#FFC9E3" /><stop offset="1" stopColor="#FFF4FA" /></radialGradient>
      <linearGradient id="cr-bark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8E5A74" /><stop offset="1" stopColor="#C58FA9" /></linearGradient>
    </defs>
  </svg>
);

/** Cilt halkası: ortam yansımalı gerçek krom (bkz. chrome.ts). */
export const Ring = () => <img className="cr-rg" src={ringUrl()} alt="" aria-hidden="true" draggable={false} />;

export const Bow = ({ className = 'cr-bow' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 120 84" aria-hidden="true">
    <path d="M60 40 C40 6 4 2 6 30 C8 58 40 62 60 40Z" fill="url(#cr-pink)" stroke="#fff" strokeWidth="1.6" />
    <path d="M60 40 C80 6 116 2 114 30 C112 58 80 62 60 40Z" fill="url(#cr-pink)" stroke="#fff" strokeWidth="1.6" />
    <path d="M52 45 L32 80 L49 73 L58 53Z M68 45 L88 80 L71 73 L62 53Z" fill="url(#cr-pink)" stroke="#fff" strokeWidth="1.6" />
    <ellipse cx="60" cy="41" rx="10" ry="12.5" fill="url(#cr-pink)" stroke="#fff" strokeWidth="1.6" />
    <path d="M20 22 C30 14 41 17 47 26 M100 22 C90 14 79 17 73 26" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity=".75" />
    <ellipse cx="56" cy="36" rx="3" ry="4" fill="#fff" opacity=".7" />
  </svg>
);

const Pendant = () => (
  <svg className="cr-pendant" viewBox="0 0 60 170" aria-hidden="true">
    <path d="M30 0 V64" stroke="#2A3346" strokeWidth="3.4" strokeDasharray="5 3" /><path d="M30 0 V64" stroke="#DCE5F1" strokeWidth="2" strokeDasharray="5 3" />
    <circle cx="30" cy="66" r="6" fill="url(#cr-chrome)" stroke="#2A3346" strokeWidth="1" /><circle cx="30" cy="66" r="6" fill="url(#cr-chrome-sh)" /><ellipse cx="28" cy="63.5" rx="2" ry="1.2" fill="#fff" opacity=".9" />
    <path d="M30 74 C10 94 4 120 30 166 C56 120 50 94 30 74Z" fill="url(#cr-crystal)" stroke="#fff" strokeWidth="1.6" />
    <path d="M30 74 L17 108 L30 166 L43 108Z" fill="#fff" opacity=".42" />
    <path d="M17 108 H43 M30 74 V166" stroke="#fff" strokeWidth="1" opacity=".7" />
    <ellipse cx="22" cy="100" rx="3" ry="8" fill="#fff" opacity=".85" />
  </svg>
);

const Clasp = () => <img className="cr-clasp" src={claspUrl()} alt="" aria-hidden="true" draggable={false} />;

const Butterfly = ({ k }: { k: number }) => (
  <svg className={`cr-bfly b${k}`} viewBox="0 0 80 60" aria-hidden="true">
    <g className="w l"><path d="M40 30 C26 0 0 4 5 26 C8 41 25 40 40 30Z M40 32 C28 52 12 58 21 44 C27 37 34 35 40 32Z" fill="url(#cr-wing)" stroke="#fff" strokeWidth="1.1" /><path d="M14 18 C20 22 28 26 36 29" stroke="#fff" strokeWidth=".8" opacity=".8" fill="none" /></g>
    <g className="w r"><path d="M40 30 C54 0 80 4 75 26 C72 41 55 40 40 30Z M40 32 C52 52 68 58 59 44 C53 37 46 35 40 32Z" fill="url(#cr-wing)" stroke="#fff" strokeWidth="1.1" /><path d="M66 18 C60 22 52 26 44 29" stroke="#fff" strokeWidth=".8" opacity=".8" fill="none" /></g>
    <rect x="38.5" y="21" width="3" height="23" rx="1.5" fill="#B05A9E" />
  </svg>
);

const rnd = (i: number, k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

const SPARKS = Array.from({ length: 14 }, (_, i) => ({ x: Math.round(rnd(i, 1) * 96) + 2, y: Math.round(rnd(i, 2) * 92) + 2, s: 8 + Math.round(rnd(i, 3) * 12), d: (rnd(i, 4) * 4).toFixed(1), t: (2.6 + rnd(i, 5) * 3).toFixed(1) }));
const PETALS = Array.from({ length: 7 }, (_, i) => ({ x: Math.round(rnd(i, 7) * 100), d: (rnd(i, 8) * 14).toFixed(1), t: (16 + rnd(i, 9) * 10).toFixed(1), s: 9 + Math.round(rnd(i, 10) * 9), r: Math.round(rnd(i, 11) * 360), w: Math.round(30 + rnd(i, 12) * 70) }));

/** Kitabın üstünde duran, tıklanmayan süs katmanı. */
export function Decor() {
  return (
    <div className="cr-decor" aria-hidden="true">
      <Defs />
      <div className="cr-edges r" /><div className="cr-edges b" />
      {SPARKS.map((p, i) => <i key={i} className="cr-spark" style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: p.s, animationDelay: `${p.d}s`, animationDuration: `${p.t}s` }}>✦</i>)}
      {PETALS.map((p, i) => <i key={i} className="cr-petal" style={{ left: `${p.x}%`, width: p.s, height: p.s * 1.2, animationDelay: `-${p.d}s`, animationDuration: `${p.t}s`, ['--r' as string]: `${p.r}deg`, ['--w' as string]: `${p.w}px` }} />)}
      <Pendant />
      <Clasp />
      <Butterfly k={1} />
      <Butterfly k={2} />
    </div>
  );
}

/** Açılış: kristal kapak cilt etrafında açılır. Oturum başına bir kez; sade mod / hareketi azalt'ta yok. */
export function Intro() {
  const [on, setOn] = useState(() => {
    try {
      if (sessionStorage.getItem('cr-intro') === '1') return false;
      if (document.documentElement.classList.contains('simple') || matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      sessionStorage.setItem('cr-intro', '1');
    } catch { /* depolama yoksa yine göster */ }
    return true;
  });
  const cover = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!on) return;
    const c = cover.current, v = veil.current;
    if (!c?.animate || !v?.animate) { setOn(false); return; }
    const a = c.animate([
      { transform: 'perspective(2400px) rotateY(0deg)' }, { transform: 'perspective(2400px) rotateY(0deg)', offset: 0.28 },
      { transform: 'perspective(2400px) rotateY(-70deg)', offset: 0.62 }, { transform: 'perspective(2400px) rotateY(-128deg)', opacity: 0 },
    ], { duration: 1700, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards' });
    v.animate([{ opacity: 1 }, { opacity: 1, offset: 0.45 }, { opacity: 0 }], { duration: 1700, easing: 'ease-in', fill: 'forwards' });
    a.onfinish = () => setOn(false);
    const t = setTimeout(() => setOn(false), 2400);
    return () => clearTimeout(t);
  }, [on]);
  if (!on) return null;
  return (
    <div className="cr-intro" aria-hidden="true">
      <div className="cr-intro-veil" ref={veil} />
      <div className="cr-intro-cover" ref={cover}>
        <div className="cr-intro-frame">
          <Bow className="cr-intro-bow" />
          <span className="cr-intro-title">Su's<br />Magical<br />Journal</span>
          <span className="cr-intro-sub">Dream · Plan · Create</span>
          <i className="cr-intro-s s1">✦</i><i className="cr-intro-s s2">✦</i><i className="cr-intro-s s3">✦</i>
        </div>
      </div>
    </div>
  );
}
