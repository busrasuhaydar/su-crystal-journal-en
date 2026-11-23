// Kristal sahne çalışma zamanı: tek tam ekran WebGL2 tuvali.
// DOM'daki [data-glass] öğelerinin konumları her karede ölçülür ve shader'a cam levha olarak verilir.
// Arkaplan: public/arkaplan.webp bir kez dokuya yüklenir ("cover"; mobilde şatoya odaklı). Cam geçişi ≤30 fps (mobilde 24),
// sekme gizliyken durur, "hareketi azalt" ve sade modda yalnızca değişiklik olunca tek kare çizilir. WebGL2 yoksa html.no-gl → CSS cam + CSS arkaplan.
import { GLASS, MAX_SLABS, VERT } from './shaders';
import { getPref } from '../lib/prefs';

// Görselde şatonun yeri (0..1, sol üst köken): gövde x 0.67–0.95, taban y≈0.62
const CASTLE0 = { x: 0.78, base: 0.62 };
let CASTLE = CASTLE0;
let custom = false;
/** Dar (dikey) ekranda görselin şato tarafına, geniş ekranda ortasına odaklan. CSS yedeği de aynı değeri kullanır (--bg-x). */
const focusX = (va: number) => { if (custom) return 0.5; const t = Math.min(Math.max((va - 0.5) / 1.2, 0), 1); return 0.5 + 0.32 * (1 - t * t * (3 - 2 * t)); };

type Kind = { r: number; bevel: number; frost: number; milk: number; thick: number; shadow: number; rim: number; irid: number };
const KINDS: Record<string, Kind> = {
  cover: { r: 34, bevel: 22, frost: 1.2, milk: 0.10, thick: 26, shadow: 1, rim: 1, irid: 0.8 },
  page: { r: 24, bevel: 12, frost: 3.2, milk: 0.58, thick: 14, shadow: 0.45, rim: 0.75, irid: 0.5 },
  left: { r: 24, bevel: 12, frost: 3.0, milk: 0.46, thick: 14, shadow: 0.45, rim: 0.75, irid: 0.6 },
  spine: { r: 14, bevel: 9, frost: 1.5, milk: 0.2, thick: 18, shadow: 0, rim: 1.1, irid: 1 },
  dock: { r: 30, bevel: 14, frost: 2.4, milk: 0.42, thick: 18, shadow: 0.9, rim: 1, irid: 0.7 },
  bar: { r: 22, bevel: 10, frost: 2.6, milk: 0.40, thick: 12, shadow: 0.5, rim: 0.8, irid: 0.6 },
  window: { r: 28, bevel: 14, frost: 0, milk: 0, thick: 22, shadow: 0, rim: 1, irid: 0.9 },
};

export const crystal = {
  turn: { start: 0, dir: 1, active: false },
  pulse(dir: 1 | -1) { this.turn = { start: performance.now(), dir, active: true }; poke(); },
};

let wake = () => {};
let loadBg: (url: string | null) => void = () => {};
let pendingBg: string | null | undefined;
/** Arkaplan görselini değiştir (null = varsayılan şato). Sahne kurulmadan çağrılırsa bekletilir. */
export function setBackground(url: string | null) { pendingBg = url; loadBg(url); }
let poke = () => {};

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
  return s;
}
function program(gl: WebGL2RenderingContext, fs: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aPos');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
  return p;
}

export function startCrystal(canvas: HTMLCanvasElement): () => void {
  const setFocus = () => document.documentElement.style.setProperty('--bg-x', `${(focusX(innerWidth / innerHeight) * 100).toFixed(1)}%`);
  setFocus();
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  if (!gl) { document.documentElement.classList.add('no-gl'); return () => {}; }
  let glassP: WebGLProgram;
  try { glassP = program(gl, GLASS); } catch (e) {
    console.warn('Crystal shader failed to compile', e); document.documentElement.classList.add('no-gl'); return () => {};
  }
  document.documentElement.classList.add('gl');
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // arkaplan görseli: yüklenene kadar CSS arkaplanı (aynı görsel) görünür
  const tex = gl.createTexture()!;
  let loaded = false, imgW = 1672, imgH = 941;
  const U = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n);
  const gu = {
    sky: U(glassP, 'uSky'), view: U(glassP, 'uView'), img: U(glassP, 'uImg'), lod: U(glassP, 'uLod'), bgLod: U(glassP, 'uBgLod'), res: U(glassP, 'uRes'), dpr: U(glassP, 'uDpr'), time: U(glassP, 'uTime'), light: U(glassP, 'uLight'), count: U(glassP, 'uCount'),
    rect: U(glassP, 'uRect'), shape: U(glassP, 'uShape'), opt: U(glassP, 'uOpt'), map: U(glassP, 'uMap'), clip: U(glassP, 'uClip'), turn: U(glassP, 'uTurn'),
  };
  const rects = new Float32Array(MAX_SLABS * 4), shapes = new Float32Array(MAX_SLABS * 4), opts = new Float32Array(MAX_SLABS * 4), maps = new Float32Array(MAX_SLABS * 4), clips = new Float32Array(MAX_SLABS * 4);

  const coarse = matchMedia('(pointer: coarse)').matches;
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('simple');
  let dpr = 1, W = 0, H = 0, mobile = 0, viewH = innerHeight, lastW = innerWidth;
  // ekran uv (0..1, sol üst) → görsel uv:  iuv = uv * s + o   ("cover" + odak)
  let cs = { sx: 1, sy: 1, ox: 0, oy: 0 }, lodK = 0, bgLod = 0;
  function layout() {
    const vw = innerWidth, vh = viewH, va = vw / vh, ia = imgW / imgH;
    if (va > ia) { const sy = ia / va; cs = { sx: 1, sy, ox: 0, oy: (1 - sy) * 0.5 }; }
    else { const sx = va / ia; cs = { sx, sy: 1, ox: (1 - sx) * focusX(va), oy: 0 }; }
    const texPerCss = (imgW * cs.sx) / vw;                  // görselin 1 css px'e düşen doku sayısı
    bgLod = Math.max(0, Math.log2(texPerCss / dpr));        // küçültme varsa mip
    lodK = Math.max(0, Math.log2(texPerCss / 0.6));         // buzlanma genişliği önceki 0.6× gökyüzü dokusuyla aynı kalsın
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.6 : 1.5);
    // dokunmatikte adres çubuğu kayarken innerHeight değişir: tuval ve görsel ölçeği en büyük yüksekliğe sabitlenir
    // (tuval yeniden boyutlanmaz, silinmez → zıplama/titreme/glitch olmaz)
    viewH = coarse && innerWidth === lastW ? Math.max(viewH, innerHeight) : innerHeight;
    lastW = innerWidth;
    W = Math.round(innerWidth * dpr); H = Math.round(viewH * dpr);
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    canvas.style.height = `${viewH}px`;
    mobile = innerWidth < 761 ? 1 : 0;
    setFocus(); layout();
  }
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => {
    const g = gl!;
    imgW = image.naturalWidth; imgH = image.naturalHeight;
    g.bindTexture(g.TEXTURE_2D, tex);
    g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, image);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR_MIPMAP_LINEAR);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    g.generateMipmap(g.TEXTURE_2D);
    loaded = true; layout(); wake();
  };
  image.onerror = () => { if (custom) { loadBg(null); return; } document.documentElement.classList.replace('gl', 'no-gl'); };
  const DEF = `${import.meta.env.BASE_URL}arkaplan.webp`;
  let curBg = '';
  loadBg = (url) => {
    const want = url || DEF;
    if (want === curBg) return;
    curBg = want; custom = !!url; CASTLE = custom ? { x: 0.5, base: 0.66 } : CASTLE0;
    const root = document.documentElement;
    root.classList.toggle('has-bg', custom);
    if (custom) root.style.setProperty('--bg-img', `url("${want}")`); else root.style.removeProperty('--bg-img');
    image.crossOrigin = custom ? 'anonymous' : null;
    image.src = want; setFocus();
  };
  if (pendingBg !== undefined) loadBg(pendingBg);
  else if (getPref('bgCustom', '0') === '1') setTimeout(() => { if (!curBg) loadBg(null); }, 3500);
  else loadBg(null);

  // ışık: fareyi yumuşakça izler; dokunmatikte yavaşça döner
  const light = { x: innerWidth * 0.25, y: -80, tx: innerWidth * 0.25, ty: -80 };
  const onMove = (e: PointerEvent) => { lastInput = performance.now(); if (e.pointerType === 'mouse') { light.tx = e.clientX; light.ty = e.clientY - 40; wake(); } };
  addEventListener('pointermove', onMove, { passive: true });
  for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart']) addEventListener(ev, () => { lastInput = performance.now(); wake(); }, { passive: true, capture: true });

  let scrollUntil = 0, raf = 0, lastFrame = 0, running = true, ready = false, lastInput = performance.now();
  const t0 = performance.now();

  function measure() {
    const els = document.querySelectorAll<HTMLElement>('[data-glass]');
    let n = 0;
    for (const el of els) {
      if (n >= MAX_SLABS) break;
      const k = KINDS[el.dataset.glass!];
      if (!k) continue;
      // dokunmatikte kayan içerikteki cam (ör. ana sayfa penceresi) CSS ile çizilir: iOS kaydırması JS'ten önde gider, WebGL levha titrerdi
      if (coarse && el.closest('.cb-scroll')) { if (!el.classList.contains('css-glass')) el.classList.add('css-glass'); continue; }
      const b = el.getBoundingClientRect();
      if (b.width < 2 || b.height < 2 || !el.getClientRects().length) continue;
      const css = getComputedStyle(el);
      const rad = parseFloat(css.borderTopLeftRadius) || k.r;
      rects.set([b.left, b.top, b.width, b.height], n * 4);
      const sc = el.closest('.cb-scroll');
      if (sc) { const c = sc.getBoundingClientRect(); clips.set([c.left, c.top, c.right, c.bottom], n * 4); }
      else clips.set([-1e5, -1e5, 1e5, 1e5], n * 4);
      shapes.set([rad, k.bevel * (mobile ? 0.8 : 1), k.frost, k.milk], n * 4);
      opts.set([k.thick * (mobile ? 0.75 : 1), k.shadow, k.rim, k.irid], n * 4);
      if (el.dataset.glass === 'window') {
        // pencere oranında, görseldeki şato + ufku çerçeveleyen bölge (görsel uv → ekran css px)
        const ar = (b.width / b.height) * (imgH / imgW);                 // pencere en/boy oranı, görsel uv biriminde
        let hh = mobile ? 0.6 : 0.62, ww = hh * ar;
        if (ww > 0.98) { ww = 0.98; hh = ww / ar; }
        const left = Math.min(Math.max(CASTLE.x - ww * (mobile ? 0.5 : 0.8), 0), 1 - ww), top = Math.min(Math.max(CASTLE.base - hh * 0.86, 0), 1 - hh);
        maps.set([((left - cs.ox) / cs.sx) * innerWidth, ((top - cs.oy) / cs.sy) * viewH, (ww / cs.sx) * innerWidth, (hh / cs.sy) * viewH], n * 4);
      } else maps.set([0, 0, 0, 0], n * 4);
      n++;
    }
    return n;
  }

  function frame(now: number, force = false) {
    raf = 0;
    if (!running) return;
    const still = reduce();
    // etkileşim yokken (8 sn) kare hızı yarıya iner: pil ve ısı tasarrufu
    const fps = coarse ? 24 : 30;
    if (!still && !force && now >= scrollUntil && now - lastFrame < 1000 / fps - 2) { raf = requestAnimationFrame(frame); return; }
    lastFrame = now;
    if (!loaded) return;
    const t = (now - t0) / 1000;
    light.x += (light.tx - light.x) * 0.12; light.y += (light.ty - light.y) * 0.12;
    if (coarse && !still) { light.tx = innerWidth * (0.5 + 0.35 * Math.sin(t * 0.25)); light.ty = innerHeight * (0.15 + 0.1 * Math.cos(t * 0.31)); }
    const g = gl!;
    // cam
    const n = measure();
    let turnX = 0, turnA = 0;
    if (crystal.turn.active) {
      const k = (now - crystal.turn.start) / 820;
      if (k >= 1) crystal.turn.active = false; else { turnX = k * 1.3 - 0.15; turnA = Math.sin(Math.PI * k); }
    }
    g.viewport(0, 0, W, H);
    g.useProgram(glassP);
    g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, tex); g.uniform1i(gu.sky, 0);
    g.uniform2f(gu.view, innerWidth, viewH); g.uniform4f(gu.img, cs.sx, cs.sy, cs.ox, cs.oy); g.uniform1f(gu.lod, lodK); g.uniform1f(gu.bgLod, bgLod);
    g.uniform2f(gu.res, W, H); g.uniform1f(gu.dpr, dpr); g.uniform1f(gu.time, still ? 12 : t);
    g.uniform2f(gu.light, light.x, light.y); g.uniform1i(gu.count, n);
    g.uniform4fv(gu.rect, rects); g.uniform4fv(gu.shape, shapes); g.uniform4fv(gu.opt, opts); g.uniform4fv(gu.map, maps); g.uniform4fv(gu.clip, clips);
    g.uniform4f(gu.turn, turnX, turnA, crystal.turn.dir, 0);
    g.drawArrays(g.TRIANGLES, 0, 3);
    if (!ready) { ready = true; requestAnimationFrame(() => document.documentElement.classList.add('gl-ready')); }
    const settling = Math.abs(light.tx - light.x) + Math.abs(light.ty - light.y) > 0.5;
    const active = performance.now() - lastInput < 2500;
    if ((!still && active) || crystal.turn.active || settling) raf = requestAnimationFrame(frame);
  }
  wake = () => { if (!raf && running) raf = requestAnimationFrame(frame); };
  poke = () => { lastInput = performance.now(); wake(); };

  // boyut değişince tuval silinir: aynı görevde hemen yeniden çiz (boş kare görünmesin)
  const onResize = () => { resize(); if (loaded && running) { cancelAnimationFrame(raf); frame(performance.now(), true); } else wake(); };
  const onVis = () => { running = !document.hidden; if (running) wake(); };
  // düzen değişince (sayfa geçişi, menü açılması) yeniden ölç
  const ro = new ResizeObserver(() => wake());
  const mo = new MutationObserver(() => { for (const el of document.querySelectorAll('[data-glass]')) ro.observe(el); wake(); });
  mo.observe(document.body, { childList: true, subtree: true });
  // kaydırırken kare hızı sınırı yok: cam levhalar DOM ile aynı karede ölçülür/çizilir (60 fps içerik, 30 fps cam titremesi olmaz)
  const onScroll = () => { lastInput = performance.now(); scrollUntil = lastInput + 220; wake(); };
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
  addEventListener('resize', onResize);
  // tarayıcı menüsünden yakınlaştırma: devicePixelRatio değişince de tuvali yeniden kur
  const vv = window.visualViewport;
  vv?.addEventListener('resize', onResize);
  // yakınlaştırma (sıkıştırma ya da tarayıcı zoom'u) sırasında WebGL cam DOM'dan geride kalıp titrer:
  // zoom varken tuval gizlenir, camlar CSS yedeğiyle çizilir (DOM ile birlikte kayar, bozulmaz); zoom bitince WebGL geri gelir
  const baseDpr = window.devicePixelRatio || 1;
  let lost = false, zoomOn = false;
  const checkZoom = () => {
    if (lost) return;
    const z = (vv ? Math.abs(vv.scale - 1) > 0.02 : false) || Math.abs((window.devicePixelRatio || 1) - baseDpr) > 0.02;
    if (z === zoomOn) return;
    zoomOn = z;
    const c = document.documentElement.classList;
    c.toggle('zm', z);
    if (z) c.replace('gl', 'no-gl'); else { c.replace('no-gl', 'gl'); resize(); wake(); }
  };
  vv?.addEventListener('resize', checkZoom); addEventListener('resize', checkZoom);
  document.addEventListener('visibilitychange', onVis);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; running = false; document.documentElement.classList.replace('gl', 'no-gl'); });
  resize(); wake();
  return () => {
    running = false; cancelAnimationFrame(raf);
    removeEventListener('pointermove', onMove); removeEventListener('resize', onResize); vv?.removeEventListener('resize', onResize); vv?.removeEventListener('resize', checkZoom); removeEventListener('resize', checkZoom);
    document.removeEventListener('visibilitychange', onVis); document.removeEventListener('scroll', onScroll, true); ro.disconnect(); mo.disconnect();
  };
}
