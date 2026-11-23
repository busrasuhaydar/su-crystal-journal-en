// Sihirli sesler: dosya yok, WebAudio ile sentezlenir. Kristal cam çınlaması (dokunuş) ve gerçek sayfa çevirme hışırtısı.
// Ayar: su:sound ('0' = kapalı). iOS'ta ilk dokunuşta ses bağlamı açılır.
import { getPref } from '../lib/prefs';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
const on = () => getPref('sound', '1') !== '0';

function ac(): AudioContext | null {
  if (!on()) return null;
  try {
    if (!ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
      master = ctx.createGain(); master.gain.value = 0.55;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

let lastGlass = 0;
/** Kristal cam çınlaması: uyumsuz kısmi sesler (gerçek cam), kısa parıltı + uzun sönüm. */
export function glassTap(strength = 1) {
  const c = ac(); if (!c || !master) return;
  const now = c.currentTime;
  if (now - lastGlass < 0.045) return;
  lastGlass = now;
  const base = 1760 * (0.94 + Math.random() * 0.14);
  const parts: [number, number, number][] = [[1, 0.16, 0.9], [2.32, 0.09, 0.6], [4.25, 0.05, 0.35], [6.8, 0.025, 0.2]];
  for (const [r, g, dec] of parts) {
    const o = c.createOscillator(), e = c.createGain();
    o.type = 'sine'; o.frequency.value = base * r;
    e.gain.setValueAtTime(0, now);
    e.gain.linearRampToValueAtTime(g * strength, now + 0.004);
    e.gain.exponentialRampToValueAtTime(0.0001, now + dec);
    o.connect(e); e.connect(master); o.start(now); o.stop(now + dec + 0.05);
  }
  // ince pırıltı (yüksek frekans gürültü tıkı)
  if (noise) {
    const s = c.createBufferSource(), f = c.createBiquadFilter(), e = c.createGain();
    s.buffer = noise; f.type = 'highpass'; f.frequency.value = 6500;
    e.gain.setValueAtTime(0.05 * strength, now); e.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    s.connect(f); f.connect(e); e.connect(master); s.start(now, Math.random()); s.stop(now + 0.08);
  }
}

/** Page çevirme: kâğıt hışırtısı (bant geçiren süpürme) + sonda yaprağın düşüş "fıp"ı. */
/** Gerçekçi sayfa sesi: kâğıdın havayı yarışı (yumuşak, alçak "fşş"), yaprak bükülürken tanecikli hışırtı,
 *  inerken çok hafif tok dokunuş. Tiz ve yüksek değil; rastgele taneciklerle her çevirme biraz farklı duyulur. */
export function pageFlip(dur = 0.9) {
  const c = ac(); if (!c || !master || !noise) return;
  const now = c.currentTime + 0.01;
  const out = c.createGain(); out.gain.value = 0.55; out.connect(master);
  // 1) hava süpürmesi: alçak geçiren gürültü, çan eğrisi
  {
    const s = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noise; lp.type = 'lowpass'; lp.Q.value = 0.4;
    lp.frequency.setValueAtTime(500, now); lp.frequency.linearRampToValueAtTime(1500, now + dur * 0.45); lp.frequency.linearRampToValueAtTime(600, now + dur);
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.16, now + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.95);
    s.connect(lp); lp.connect(g); g.connect(out); s.start(now, Math.random() * 0.4); s.stop(now + dur + 0.05);
  }
  // 2) kâğıt hışırtısı: bant geçiren gürültü + rastgele kısa tanecikler (bükülme anında yoğun)
  {
    const s = c.createBufferSource(), hp = c.createBiquadFilter(), bp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noise; hp.type = 'highpass'; hp.frequency.value = 1400; bp.type = 'bandpass'; bp.Q.value = 0.6; bp.frequency.value = 3200;
    g.gain.setValueAtTime(0.0001, now);
    const ks = Array.from({ length: 16 }, () => Math.pow(Math.random(), 0.8) * 0.75).sort((a, b) => a - b);   // ilk %75'e yayılır
    let free = now;
    for (const k of ks) {
      if (now + dur * k < free) continue;                       // üst üste binmesin
      const t = now + dur * k, len = 0.012 + Math.random() * 0.03;
      const amp = (0.02 + Math.random() * 0.05) * Math.sin(Math.PI * Math.min(1, k / 0.75));
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(Math.max(0.0002, amp), t + len * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      free = t + len + 0.004;
    }
    s.connect(hp); hp.connect(bp); bp.connect(g); g.connect(out); s.start(now, Math.random() * 0.5); s.stop(now + dur + 0.05);
  }
  // 3) yaprak yerine otururken yumuşak, alçak dokunuş
  {
    const t = now + dur * 0.92;
    const s = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noise; lp.type = 'lowpass'; lp.frequency.value = 320;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    s.connect(lp); lp.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + 0.14);
  }
}

/** Her dokunulabilir öğeye cam sesi. Bir kez kurulur. */
export function installSounds() {
  const sel = 'button, a[href], [role="button"], .check, input[type="checkbox"], input[type="radio"], select, summary, .chip';
  document.addEventListener('pointerdown', (e) => {
    const t = e.target as HTMLElement | null;
    const el = t?.closest<HTMLElement>(sel);
    if (!el || (el as HTMLButtonElement).disabled) return;
    glassTap(el.matches('.btn-primary, .cr-new, .check') ? 1.15 : 0.8);
  }, { passive: true, capture: true });
}
