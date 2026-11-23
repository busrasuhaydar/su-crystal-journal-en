// Gerçek krom: halka ve kilit bir kez küçük bir tuvalde piksel piksel "ortam yansıması" ile çizilir (çizgi/degrade taklidi değil).
// Her pikselde yüzey normali bulunur → bakış vektörü yansıtılır → stüdyo ortamında (gökyüzü, keskin ufuk, koyu zemin, ışık kutusu, pembe sıçrama) aranır.
// Sonuç PNG data URL olarak önbelleğe alınır; <img> ile kullanılır, çalışma zamanı maliyeti sıfır.

type RGB = [number, number, number];
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** u: yansıma vektörünün yukarı bileşeni, rx: sağa, rz: izleyiciye */
function env(u: number, rx: number, rz: number): RGB {
  let c: RGB;
  if (u > 0) {
    c = mix([236, 244, 255], [96, 132, 196], Math.pow(clamp(u), 0.65));            // açık gökyüzü → derin mavi
    c = mix(c, [255, 206, 232], 0.28 * sstep(0.1, 0.9, rx * 0.5 + 0.5) * (1 - u));   // sahnenin pembe ışığı
  } else {
    const t = -u;
    c = mix([104, 112, 138], [40, 46, 68], sstep(0.03, 0.42, t));                     // ufkun hemen altı: orta çelik → koyu
    c = mix(c, [214, 182, 226], sstep(0.5, 0.95, t));                                 // zeminden pembe-lila sıçrama (parlak)
  }
  // keskin parlak ufuk çizgisi
  const hz = Math.exp(-Math.pow((u - 0.02) / 0.06, 2));
  c = mix(c, [255, 255, 255], 0.95 * hz);
  // ışık kutusu (softbox) ve güneş
  const box = sstep(0.18, 0.3, u) * sstep(0.12, 0.0, Math.abs(rx - 0.35)) * sstep(0.0, 0.3, rz);
  c = mix(c, [255, 255, 255], 0.85 * box);
  const sun = Math.pow(clamp(rx * -0.42 + u * 0.62 + rz * 0.66), 140);
  return [c[0] + 255 * sun, c[1] + 250 * sun, c[2] + 245 * sun];
}

/** Yüzey normali (nx, ny: ekran düzleminde, y aşağı; nz: izleyiciye) → krom rengi */
function chromeAt(nx: number, ny: number, nz: number): RGB {
  const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
  const rx = 2 * nz * nx, ry = 2 * nz * ny, rz = 2 * nz * nz - 1;
  const c = env(-ry, rx, rz);
  // kenarlarda (Fresnel) hafif koyulaşma + kontrast
  const edge = Math.pow(1 - nz, 4);
  const k = 1 - 0.28 * edge;
  return [clamp(c[0] * k * 1.08, 0, 255), clamp(c[1] * k * 1.08, 0, 255), clamp(c[2] * k * 1.08, 0, 255)];
}

function canvas(w: number, h: number) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

const S = 4;
let ring: string | null = null, clasp: string | null = null;

/** Cilt halkası: iki delik + deliklere giren yuvarlak krom boru + sayfaya düşen gölge. 80×36 birim. */
export function ringUrl(): string {
  if (ring) return ring;
  const W = 80, H = 36;
  const out = canvas(W * S, H * S), ctx = out.getContext('2d')!;
  // delikler: koyu iç + alt dudakta ışık
  for (const x of [14, 66]) {
    const g = ctx.createRadialGradient(x * S, 21 * S, 1, x * S, 22 * S, 9 * S);
    g.addColorStop(0, 'rgba(24,6,36,.95)'); g.addColorStop(0.75, 'rgba(58,20,80,.7)'); g.addColorStop(1, 'rgba(90,42,112,.3)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x * S, 22 * S, 8.6 * S, 4.9 * S, 0, 0, 7); ctx.fill();
    const rim = ctx.createLinearGradient(0, 17 * S, 0, 27 * S);
    rim.addColorStop(0, 'rgba(40,14,56,.7)'); rim.addColorStop(0.55, 'rgba(255,255,255,.12)'); rim.addColorStop(1, 'rgba(255,255,255,.95)');
    ctx.strokeStyle = rim; ctx.lineWidth = 1.1 * S; ctx.beginPath(); ctx.ellipse(x * S, 22 * S, 8.6 * S, 4.9 * S, 0, 0, 7); ctx.stroke();
  }
  // boru: kübik Bezier → çoklu çizgi
  const P = [[14, 22], [22, 3], [58, 3], [66, 22]];
  const pts: [number, number][] = [];
  for (let i = 0; i <= 160; i++) {
    const t = i / 160, m = 1 - t;
    pts.push([m * m * m * P[0][0] + 3 * m * m * t * P[1][0] + 3 * m * t * t * P[2][0] + t * t * t * P[3][0], m * m * m * P[0][1] + 3 * m * m * t * P[1][1] + 3 * m * t * t * P[2][1] + t * t * t * P[3][1]]);
  }
  const R = 4.3;
  const tube = canvas(W * S, H * S), tc = tube.getContext('2d')!, img = tc.createImageData(W * S, H * S);
  for (let py = 0; py < H * S; py++) {
    for (let px = 0; px < W * S; px++) {
      const x = (px + 0.5) / S, y = (py + 0.5) / S;
      if (y > 23.4) continue;                                    // delik hizasında kesilir: boru deliğe girer
      let best = 1e9, bx = 0, by = 0, bi = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [cx, cy] = pts[i + 1];
        const dx = cx - ax, dy = cy - ay, t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy));
        const qx = ax + dx * t, qy = ay + dy * t, d = Math.hypot(x - qx, y - qy);
        if (d < best) { best = d; bx = qx; by = qy; bi = i + t; }
      }
      const alpha = clamp((R - best) * S + 0.5);
      if (alpha <= 0) continue;
      const nx = (x - bx) / R, ny = (y - by) / R, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const c = chromeAt(nx, ny, nz);
      const s = bi / (pts.length - 1), ao = 0.42 + 0.58 * sstep(0, 0.1, s) * sstep(1, 0.9, s);   // uçlarda deliğin gölgesi
      const k = (py * W * S + px) * 4;
      img.data[k] = c[0] * ao; img.data[k + 1] = c[1] * ao; img.data[k + 2] = c[2] * ao; img.data[k + 3] = alpha * 255;
    }
  }
  tc.putImageData(img, 0, 0);
  ctx.save();
  ctx.shadowColor = 'rgba(52,12,76,.5)'; ctx.shadowBlur = 5 * S; ctx.shadowOffsetY = 6 * S;
  ctx.drawImage(tube, 0, 0);
  ctx.restore();
  ctx.drawImage(tube, 0, 0);
  return (ring = out.toDataURL('image/png'));
}

/** Kilit: yuvarlatılmış krom plaka + dil, vidalar, anahtar deliği. 64×120 birim. */
export function claspUrl(): string {
  if (clasp) return clasp;
  const W = 64, H = 120;
  const out = canvas(W * S, H * S), ctx = out.getContext('2d')!;
  const rr = (x: number, y: number, w: number, h: number, r: number, px: number, py: number) => {
    const qx = Math.abs(px - (x + w / 2)) - w / 2 + r, qy = Math.abs(py - (y + h / 2)) - h / 2 + r;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  };
  const sdf = (x: number, y: number) => Math.min(rr(2, 16, 34, 88, 10, x, y), rr(28, 28, 34, 64, 13, x, y));
  const body = canvas(W * S, H * S), bc = body.getContext('2d')!, img = bc.createImageData(W * S, H * S);
  const B = 6;
  for (let py = 0; py < H * S; py++) {
    for (let px = 0; px < W * S; px++) {
      const x = (px + 0.5) / S, y = (py + 0.5) / S, d = sdf(x, y);
      const alpha = clamp(0.5 - d * S);
      if (alpha <= 0) continue;
      const e = Math.max(-d, 0), tt = clamp(e / B), u = 1 - tt;
      const slope = Math.min(u / Math.sqrt(Math.max(1 - u * u, 0.0004)), 6);
      const eps = 0.5;
      let gx = sdf(x + eps, y) - sdf(x - eps, y), gy = sdf(x, y + eps) - sdf(x, y - eps);
      const gl = Math.hypot(gx, gy) || 1; gx /= gl; gy /= gl;
      // düz yüzeyde hafif kubbe: büyük ölçekli gökyüzü/ufuk/zemin bantları plaka boyunca görünür
      const cx = (x - 32) / 32, cy = (y - 60) / 60;
      const c = chromeAt(gx * slope + cx * 0.32, gy * slope + cy * 0.9, 1);
      const k = (py * W * S + px) * 4;
      img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = alpha * 255;
    }
  }
  bc.putImageData(img, 0, 0);
  ctx.save();
  ctx.shadowColor = 'rgba(40,30,80,.5)'; ctx.shadowBlur = 6 * S; ctx.shadowOffsetY = 5 * S;
  ctx.drawImage(body, 0, 0);
  ctx.restore();
  ctx.drawImage(body, 0, 0);
  // ince koyu kontur + iç parlak çizgi
  ctx.lineWidth = 0.8 * S;
  ctx.strokeStyle = 'rgba(20,26,40,.75)';
  const path = new Path2D();
  const sub = (x: number, y: number, w: number, h: number, r: number) => { path.roundRect(x * S, y * S, w * S, h * S, r * S); };
  sub(2, 16, 34, 88, 10); sub(28, 28, 34, 64, 13);
  ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.stroke(path); ctx.restore();
  // vidalar
  for (const [sx, sy, a] of [[19, 34, 0.5], [19, 86, -0.7]] as const) {
    const g = ctx.createRadialGradient((sx - 1.2) * S, (sy - 1.4) * S, 0.3 * S, sx * S, sy * S, 4.8 * S);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#c9d4e4'); g.addColorStop(0.75, '#5f6c85'); g.addColorStop(1, '#202838');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx * S, sy * S, 4.6 * S, 0, 7); ctx.fill();
    ctx.strokeStyle = '#12161f'; ctx.lineWidth = 1.2 * S; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo((sx - 2.9 * Math.cos(a)) * S, (sy - 2.9 * Math.sin(a)) * S); ctx.lineTo((sx + 2.9 * Math.cos(a)) * S, (sy + 2.9 * Math.sin(a)) * S); ctx.stroke();
  }
  // anahtar deliği: çelik halka + koyu iç
  const kx = 47, ky = 56;
  const kr = ctx.createLinearGradient(0, (ky - 9) * S, 0, (ky + 9) * S);
  kr.addColorStop(0, '#2a3144'); kr.addColorStop(0.5, '#e8eef8'); kr.addColorStop(1, '#ffffff');
  ctx.fillStyle = kr; ctx.beginPath(); ctx.arc(kx * S, ky * S, 8.6 * S, 0, 7); ctx.fill();
  ctx.fillStyle = '#0d1018'; ctx.beginPath(); ctx.arc(kx * S, ky * S, 6.4 * S, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo((kx - 2.2) * S, (ky + 3) * S); ctx.lineTo((kx - 4) * S, (ky + 19) * S); ctx.lineTo((kx + 4) * S, (ky + 19) * S); ctx.lineTo((kx + 2.2) * S, (ky + 3) * S); ctx.fill();
  return (clasp = out.toDataURL('image/png'));
}

let arch: string | null = null;
/** Şato penceresi çerçevesi: kemerli krom boru (dış kalın + iç ince boncuk), tepede kilit taşı mücevheri,
 *  kemer başlangıçlarında krom küreler, altta pervaz. 120×160 birim; iç pencere sınırı d = T (çerçeve kalınlığı). */
export const ARCH = { W: 120, H: 160, T: 10 };
export function archUrl(): string {
  if (arch) return arch;
  const { W, H, T } = ARCH, K = 4;
  const out = canvas(W * K, H * K), ctx = out.getContext('2d')!;
  const img = ctx.createImageData(W * K, H * K), px = img.data;
  const R = W / 2, cx = W / 2;
  // kemerin içine doğru işaretli uzaklık ve iç yön (gradyan)
  const sdf = (x: number, y: number): [number, number, number] => {
    if (y < R) { const dx = x - cx, dy = y - R, l = Math.hypot(dx, dy) || 1; return [R - l, -dx / l, -dy / l]; }
    const a = x, b = W - x, c = H - y;
    if (a <= b && a <= c) return [a, 1, 0];
    if (b <= c) return [b, -1, 0];
    return [c, 0, -1];
  };
  const put = (i: number, c: RGB, a: number) => { px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = Math.round(clamp(a) * 255); };
  const spheres: [number, number, number][] = [[2.2, R, 5.2], [W - 2.2, R, 5.2], [cx, 1.5, 0]]; // kemer başları
  for (let j = 0; j < H * K; j++) for (let i = 0; i < W * K; i++) {
    const x = (i + 0.5) / K, y = (j + 0.5) / K, o = (j * W * K + i) * 4;
    let col: RGB | null = null, al = 0;
    // küreler
    for (const [sx, sy, sr] of spheres) {
      if (!sr) continue;
      const dx = (x - sx) / sr, dy = (y - sy) / sr, q = dx * dx + dy * dy;
      if (q < 1) { col = chromeAt(dx, dy, Math.sqrt(1 - q)); al = clamp((1 - Math.sqrt(q)) * sr * K * 0.5); }
    }
    // kilit taşı: tepede eşkenar dörtgen mücevher (pembe kristal + krom kenar)
    if (!col) {
      const kx = Math.abs(x - cx) / 7, ky = Math.abs(y - (T * 0.55)) / 9, m = kx + ky;
      if (m < 1) {
        const nx = Math.sign(x - cx) * 0.7, ny = Math.sign(y - T * 0.55) * 0.55;
        if (m > 0.8) col = chromeAt(nx, ny, 0.5);
        else { const g = chromeAt(nx * 0.6, ny * 0.6, 1); col = [clamp(g[0] * 0.55 + 255 * 0.45, 0, 255), clamp(g[1] * 0.35 + 70, 0, 255), clamp(g[2] * 0.45 + 150, 0, 255)]; }
        al = clamp((1 - m) * 9 * K);
      }
    }
    if (!col) {
      const [d, gx, gy] = sdf(x, y);
      if (d >= -0.2 && d <= T) {
        const outer = T * 0.68;
        let s: number, w: number;
        if (d <= outer) { s = (d - outer / 2) / (outer / 2); w = outer; }           // kalın dış boru
        else if (d >= outer + 0.5) { const a = outer + 0.5; s = (d - (a + T) / 2) / ((T - a) / 2); w = T - a; } // ince iç boncuk
        else { s = 1; w = 0.5; }                                                      // ikisi arası oluk
        s = clamp(s, -1, 1);
        const nz = Math.sqrt(Math.max(0, 1 - s * s));
        col = w > 0.6 ? chromeAt(s * gx, s * gy, nz) : [40, 30, 60];
        // ince yiv deseni (dış boruda boydan boya ışık halkaları)
        const along = y < R ? Math.atan2(y - R, x - cx) * R : (x < cx ? -y : y);
        if (d <= outer) { const r = 0.94 + 0.06 * Math.cos(along * 1.6); col = [col[0] * r, col[1] * r, col[2] * r]; }
        al = clamp(Math.min(d + 0.2, T - d + 0.2) * K * 0.6);
      }
    }
    if (col) put(o, col, al);
  }
  ctx.putImageData(img, 0, 0);
  // çerçevenin pencereye düşen ince gölgesi
  arch = out.toDataURL('image/png');
  return arch;
}
