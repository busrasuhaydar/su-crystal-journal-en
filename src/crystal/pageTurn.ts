// Gerçekçi sayfa çevirme: köşeden katlanan sayfa (aşağıda ayrıntı).
// Yönlendirici yeni sayfayı çizmeden hemen önce sağ sayfanın DOM kopyası alınır; animasyon rAF ile 2B dönüşüm + clip-path
// günceller. Hareketi azalt / sade / zoom modunda kapalı.
import { crystal } from './scene';
import { pageFlip } from './sound';
import { NAV, isActive } from './Nav';

const off = () => {
  const c = document.documentElement.classList;
  return c.contains('simple') || c.contains('zm') || matchMedia('(prefers-reduced-motion: reduce)').matches;
};
type Snap = { tpl: HTMLElement; scrollTop: number; dir: 1 | -1 };
let pending: Snap | null = null;
let running: (() => void) | null = null;
let lastPath = location.pathname;
let lastIdx = (history.state as { idx?: number } | null)?.idx ?? 0;
const navOf = (path: string) => NAV.findIndex((n) => isActive(path, n));
/** Journal mantığı: menüde ileride olan bölüme geçiş sayfayı ileri çevirir, geride olana geçiş geri çevirir; aynı bölümde derine inmek ileri. */
function dirBetween(from: string, to: string, fallback: 1 | -1): 1 | -1 {
  const a = navOf(from), b = navOf(to);
  if (a >= 0 && b >= 0 && a !== b) return b > a ? 1 : -1;
  return fallback;
}

/** Sağ sayfanın (başlık + içerik) etkileşimsiz kopyası. */
function cloneHost(host: HTMLElement) {
  const c = host.cloneNode(true) as HTMLElement;
  c.removeAttribute('data-glass'); c.removeAttribute('style');
  c.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  c.querySelectorAll('[data-glass]').forEach((n) => n.removeAttribute('data-glass'));
  c.querySelectorAll('.cb-corner').forEach((n) => n.remove());
  c.className = 'cb-clone';
  c.querySelector('.cb-scroll')?.classList.replace('cb-scroll', 'cb-clone-scroll');
  return c;
}

function snapshot(dir: 1 | -1) {
  if (off()) return;
  const page = document.querySelector<HTMLElement>('.cb-scroll');
  const host = document.querySelector<HTMLElement>('.cb-right');
  if (!page || !host) return;
  running?.();
  pending = { tpl: cloneHost(host), scrollTop: page.scrollTop, dir };
}

function onPath(next: string, dir: 1 | -1) {
  const changed = next !== lastPath;
  const d = dirBetween(lastPath, next, dir);
  lastPath = next;
  if (changed) snapshot(d);
}

/** history'yi sarmala: yönlendirici pushState'i çağırmadan önce kopya alınır. Bir kez kurulur. */
export function installPageTurn() {
  const push = history.pushState.bind(history);
  history.pushState = (data: unknown, unused: string, url?: string | URL | null) => {
    if (url != null) onPath(new URL(String(url), location.href).pathname, 1);
    lastIdx = (data as { idx?: number } | null)?.idx ?? lastIdx + 1;
    push(data, unused, url);
  };
  addEventListener('popstate', () => {
    const idx = (history.state as { idx?: number } | null)?.idx ?? lastIdx - 1;
    const dir: 1 | -1 = idx > lastIdx ? 1 : -1;
    lastIdx = idx;
    onPath(location.pathname, dir);
  });
}

// ── köşeden katlanan sayfa (kitap/dergi uygulamalarındaki gibi) ──
// Sayfanın sağ alt köşesi bir yay çizerek cilde doğru çekilir. Katlama çizgisi = köşe ile çekilen nokta arasındaki
// doğrunun dik ortaylayı. Çizginin köşe tarafı sayfadan kesilir; o parça çizgiye göre yansıtılarak sayfanın arka yüzü
// (buzlu kristal, içerik ayna gibi silik görünür) olarak eski sayfanın üstüne katlanır. Açılan bölgede yeni sayfa görünür,
// katlama çizgisi boyunca yeni sayfaya gölge, katlanan parçanın kıvrımında ışık/gölge vardır. Yalnız 2B dönüşüm + clip-path.
type Pt = [number, number];
function half(poly: Pt[], M: Pt, n: Pt, keepC: boolean): Pt[] {
  const side = (q: Pt) => ((q[0] - M[0]) * n[0] + (q[1] - M[1]) * n[1]) * (keepC ? 1 : -1);
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const sa = side(a), sb = side(b);
    if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) { const k = sa / (sa - sb); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); }
  }
  return out;
}
const poly = (ps: Pt[]) => (ps.length < 3 ? 'polygon(0 0, 0 0, 0 0)' : `polygon(${ps.map((q) => `${q[0].toFixed(1)}px ${q[1].toFixed(1)}px`).join(', ')})`);

type Fold = { under: HTMLElement; top: HTMLElement; wrap: HTMLElement; flap: HTMLElement; ushade: HTMLElement; fshade: HTMLElement; W: number; H: number };

function layer(rect: DOMRect, cls: string, z: number, stage: Element) {
  const d = document.createElement('div'); d.className = cls; d.setAttribute('aria-hidden', 'true');
  d.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;z-index:${z}`;
  stage.appendChild(d); return d;
}
function withScroll(c: HTMLElement, top: number) { const s = c.querySelector<HTMLElement>('.cb-clone-scroll'); if (s) s.scrollTop = top; }

function buildFold(rect: DOMRect, radius: string, topC: HTMLElement, topScroll: number, underC: HTMLElement, underScroll: number): Fold {
  const stage = document.querySelector('.cb-stage') ?? document.body;
  const under = layer(rect, 'pf-layer', 24, stage); under.style.borderRadius = radius; under.appendChild(underC);
  const ushade = document.createElement('div'); ushade.className = 'pf-strip pf-ushade'; under.appendChild(ushade);
  const top = layer(rect, 'pf-layer', 25, stage); top.style.borderRadius = radius; top.appendChild(topC);
  const wrap = layer(rect, 'pf-wrap', 26, stage);
  const flap = document.createElement('div'); flap.className = 'pf-flap'; flap.style.borderRadius = radius;
  const ghost = topC.cloneNode(true) as HTMLElement; ghost.classList.add('pf-ghost'); flap.appendChild(ghost);
  const fshade = document.createElement('div'); fshade.className = 'pf-strip pf-fshade'; flap.appendChild(fshade);
  wrap.appendChild(flap);
  withScroll(underC, underScroll); withScroll(topC, topScroll); withScroll(ghost, topScroll);
  return { under, top, wrap, flap, ushade, fshade, W: rect.width, H: rect.height };
}

/** p: 0 = sayfa düz, 1 = tamamen çevrilmiş (cilde katlanmış). */
function poseFold(F: Fold, p: number) {
  const { W, H } = F;
  const rectP: Pt[] = [[0, 0], [W, 0], [W, H], [0, H]];
  if (p < 0.002) {
    F.top.style.clipPath = poly(rectP); F.under.style.clipPath = poly([]); F.flap.style.clipPath = poly([]);
    return;
  }
  // köşe yayı: sağ alttan cildin ötesine, yukarı doğru kavis çizerek
  const C: Pt = [W, H];
  const P: Pt = [W - 2 * W * p, H - H * 0.2 * Math.sin(Math.PI * p) - H * 0.04 * p];
  const dx = C[0] - P[0], dy = C[1] - P[1], len = Math.hypot(dx, dy) || 1;
  const n: Pt = [dx / len, dy / len], M: Pt = [(C[0] + P[0]) / 2, (C[1] + P[1]) / 2];
  const cSide = half(rectP, M, n, true), sSide = half(rectP, M, n, false);
  F.top.style.clipPath = poly(sSide);
  F.under.style.clipPath = poly(cSide);
  F.flap.style.clipPath = poly(cSide);
  // yansıma matrisi (katlama çizgisine göre)
  const a = 1 - 2 * n[0] * n[0], b = -2 * n[0] * n[1], d = 1 - 2 * n[1] * n[1];
  const k = 2 * (M[0] * n[0] + M[1] * n[1]);
  F.flap.style.transform = `matrix(${a.toFixed(5)}, ${b.toFixed(5)}, ${b.toFixed(5)}, ${d.toFixed(5)}, ${(k * n[0]).toFixed(2)}, ${(k * n[1]).toFixed(2)})`;
  // katlama çizgisi boyunca şeritler (yeni sayfadaki gölge + katlanan parçadaki kıvrım ışığı)
  const L = 2 * Math.hypot(W, H), deg = (Math.atan2(n[0], -n[1]) * 180) / Math.PI;
  const hw = Math.min(W * 0.45, Math.max(60, len * 0.6));
  for (const el of [F.ushade, F.fshade]) {
    el.style.width = `${L}px`; el.style.height = `${hw * 2}px`;
    el.style.transform = `translate(${(M[0] - L / 2).toFixed(1)}px, ${(M[1] - hw).toFixed(1)}px) rotate(${deg.toFixed(2)}deg)`;
  }
  const flex = Math.sin(Math.PI * Math.min(1, p * 1.1));
  F.ushade.style.opacity = (0.35 + 0.65 * flex).toFixed(3);
  F.fshade.style.opacity = '1';
  F.wrap.style.filter = `drop-shadow(${(-8 * flex).toFixed(1)}px ${(4 * flex).toFixed(1)}px ${(14 * flex + 4).toFixed(1)}px rgba(60,10,50,${(0.18 + 0.22 * flex).toFixed(3)}))`;
  // katlanan parça cildin ötesine (menünün üstüne) geçerken söner
  F.wrap.style.opacity = p > 0.72 ? Math.max(0, (1 - p) / 0.28).toFixed(3) : '1';
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** New page DOM'a yerleşince (useLayoutEffect) çağrılır: animasyonu oynatır. */
export function playPageTurn() {
  const snap = pending;
  pending = null;
  const page = document.querySelector<HTMLElement>('.cb-scroll');
  if (page) page.scrollTop = 0;
  if (!snap) return;
  const host = document.querySelector<HTMLElement>('.cb-right');
  if (!host) return;
  const rect = host.getBoundingClientRect();
  const radius = getComputedStyle(host).borderRadius || '20px';
  const narrow = innerWidth < 761;
  const dur = narrow ? 780 : 950;
  crystal.pulse(snap.dir);
  pageFlip(dur / 1000);
  const fresh = cloneHost(host);
  // ileri: üstte eski sayfa katlanıp gider, altta yeni sayfa açılır. Back: aynı hareketin tersi — yeni sayfa katlı hâlden açılıp eski sayfanın üstüne kapanır.
  const F = snap.dir > 0 ? buildFold(rect, radius, snap.tpl, snap.scrollTop, fresh, 0) : buildFold(rect, radius, fresh, 0, snap.tpl, snap.scrollTop);
  host.classList.add('cl-hide');
  const t0 = performance.now();
  let raf = 0;
  const finish = () => { cancelAnimationFrame(raf); F.under.remove(); F.top.remove(); F.wrap.remove(); host.classList.remove('cl-hide'); running = null; };
  running = finish;
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / dur);
    const e = easeInOut(t);
    poseFold(F, snap.dir > 0 ? e : 1 - e);
    if (t < 1) raf = requestAnimationFrame(step); else finish();
  };
  poseFold(F, snap.dir > 0 ? 0 : 1);
  raf = requestAnimationFrame(step);
}
