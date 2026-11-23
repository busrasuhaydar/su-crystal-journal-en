// Kristal defter shader'ları (WebGL2).
// Arkaplan: public/arkaplan.webp (masalsı şato manzarası) tek doku olarak yüklenir, "cover" ile ekrana oturur; mipmap → buzlu cam bulanıklığı için ücretsiz LOD.
// GLASS: tam çözünürlükte, DOM'dan ölçülen cam levhaların (kapak, sayfalar, cilt, dok) fiziksel görünümü:
//    yuvarlatılmış kalın kenar profili, Snell kırılması (RGB ayrı kırılma indisi = dağılma), Fresnel, speküler,
//    inci yanardönerliği, buzlanma (mip LOD), süt beyazı okunurluk katmanı, iç kostik çizgi, yere düşen gölge.

export const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

export const MAX_SLABS = 8;

export const GLASS = `#version 300 es
precision highp float;
uniform sampler2D uSky;   // arkaplan görseli (mipmap'li)
uniform vec2 uView;       // görsel eşlemesinin dayandığı görünüm boyutu (css px; mobilde adres çubuğuna karşı sabit)
uniform vec4 uImg;        // ekran uv → görsel uv: (ölçek x, ölçek y, kayma x, kayma y) (cover + odak)
uniform float uLod;       // buzlanma LOD'una eklenen, görsel çözünürlüğüne göre düzeltme
uniform float uBgLod;     // arkaplanın kendi LOD'u (küçültme kaynaklı)
uniform vec2 uRes;        // tuval (cihaz px)
uniform float uDpr;
uniform float uTime;
uniform vec2 uLight;      // ışık (css px)
uniform int uCount;
uniform vec4 uRect[${MAX_SLABS}];   // x, y, w, h (css px, sol üst köken)
uniform vec4 uShape[${MAX_SLABS}];  // yarıçap, kenar genişliği, buzlanma LOD, süt
uniform vec4 uOpt[${MAX_SLABS}];    // kalınlık, gölge, kenar parlaklığı, yanardöner
uniform vec4 uMap[${MAX_SLABS}];    // sihirli pencere: levhanın içine sahnenin hangi bölgesi çizilecek (x,y,w,h css px; w=0 → doğrudan arka)
uniform vec4 uClip[${MAX_SLABS}];   // kaydırma kabı sınırı (x0, y0, x1, y1)
uniform vec4 uTurn;       // x: ilerleme 0..1, y: genlik, z: yön
out vec4 o;

float sdRound(vec2 p, vec2 c, vec2 h, float r) {
  vec2 q = abs(p - c) - h + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
vec3 skyAt(vec2 css, float lod) {
  vec2 iuv = (css / uView) * uImg.xy + uImg.zw;
  return textureLod(uSky, clamp(iuv, 0.0005, 0.9995), lod).rgb;
}
float ang0(vec2 p, vec2 c) { return atan(p.y - c.y, p.x - c.x); }
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  vec3 col = skyAt(p, uBgLod);
  vec2 L2 = normalize(uLight - p + 0.001);

  for (int i = 0; i < ${MAX_SLABS}; i++) {
    if (i >= uCount) break;
    vec4 R = uRect[i]; vec4 S = uShape[i]; vec4 O = uOpt[i]; vec4 M = uMap[i]; vec4 K = uClip[i];
    if (p.x < K.x || p.y < K.y || p.x > K.z || p.y > K.w) continue;
    vec2 c = R.xy + R.zw * 0.5, h = R.zw * 0.5;
    float r = min(S.x, min(h.x, h.y));
    float d = sdRound(p, c, h, r);

    // yere düşen yumuşak gölge + gölgede ışık toplayan pembe kostik
    if (O.y > 0.0 && d > 0.0) {
      float ds = sdRound(p - vec2(0.0, 18.0), c, h, r);
      float sh = (1.0 - smoothstep(-12.0, 46.0, ds)) * O.y;
      col = mix(col, col * vec3(0.78, 0.58, 0.76), sh * 0.55);
      float ca = exp(-pow((ds - 6.0) / 7.0, 2.0)) * O.y;
      col += vec3(1.0, 0.72, 0.86) * ca * 0.10;
    }
    if (d > 0.8) continue;

    float e = max(-d, 0.0);
    float B = S.y;
    float tt = clamp(e / B, 0.0, 1.0);
    // gradyan (dışa doğru)
    vec2 eps = vec2(0.75, 0.0);
    vec2 g = vec2(sdRound(p + eps.xy, c, h, r) - sdRound(p - eps.xy, c, h, r), sdRound(p + eps.yx, c, h, r) - sdRound(p - eps.yx, c, h, r));
    g = normalize(g + 1e-5);
    // çeyrek daire kenar profili → eğim
    float u = 1.0 - tt;
    float slope = clamp(u / sqrt(max(1.0 - u * u, 0.0004)), 0.0, 7.0);
    vec3 N = normalize(vec3(g * slope, 1.0));
    float thick = O.x;

    // Snell kırılması: RGB için farklı indis → kenarlarda prizma dağılması
    vec3 I = vec3(0.0, 0.0, -1.0);
    vec3 rr = refract(I, N, 1.0 / 1.44), rg = refract(I, N, 1.0 / 1.50), rb = refract(I, N, 1.0 / 1.57);
    float lens = thick * (0.6 + 0.4 * u);
    vec2 offR = rr.xy / max(-rr.z, 0.2) * lens, offG = rg.xy / max(-rg.z, 0.2) * lens, offB = rb.xy / max(-rb.z, 0.2) * lens;
    // iç yüzeyde hafif büyüteç (merkeze doğru)
    vec2 mag = (c - p) * 0.035 * (1.0 - tt * 0.5);
    vec2 base = p;
    if (M.z > 0.0) { vec2 k = M.zw / R.zw; base = M.xy + (p - R.xy) * k; offR *= k; offG *= k; offB *= k; mag = vec2(0.0); }
    float sm = smoothstep(0.0, 1.0, tt);
    float lod = uBgLod + S.z * sm + uLod * min(S.z, 1.0) * sm;
    vec3 refr = vec3(skyAt(base + offR + mag, lod).r, skyAt(base + offG + mag, lod).g, skyAt(base + offB + mag, lod).b);

    if (M.z > 0.0) { refr = mix(vec3(dot(refr, vec3(0.333))), refr, 1.3); refr = (refr - 0.5) * 1.14 + 0.47; }
    // süt beyazı okunurluk katmanı (kenarda berrak, içte buzlu)
    float milk = S.w * 0.82 * smoothstep(0.15, 1.0, tt);
    vec3 glass = mix(refr * vec3(1.02, 0.98, 1.03), vec3(1.0, 0.965, 0.985), milk);
    glass += vec3(0.04, 0.02, 0.05) * (1.0 - milk);

    // ışık: speküler (kenar profili üzerinde) + Fresnel + inci yanardönerlik
    vec3 Lv = normalize(vec3(uLight - p, 260.0));
    vec3 H = normalize(Lv + vec3(0.0, 0.0, 1.0));
    float spec = pow(max(dot(N, H), 0.0), 70.0) * (1.0 - N.z) * 4.0;
    float fres = pow(1.0 - N.z, 2.2);
    vec3 irid = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + e * 0.045 + dot(g, L2) * 0.35 + uTime * 0.03));
    glass += (vec3(1.0) * spec + mix(vec3(1.0), irid, O.w) * fres * 0.7) * O.z;
    // sihirli ince film: kenar bandında turkuaz↔pembe yanardöner ışıltı
    glass += mix(vec3(0.35, 1.0, 0.95), vec3(1.0, 0.5, 0.8), 0.5 + 0.5 * sin(ang0(p, c) * 2.0 + uTime * 0.35)) * exp(-pow((e - B * 0.55) / (B * 0.35 + 0.5), 2.0)) * 0.07 * O.z;
    // geniş yüzey parlaması (ışığa göre)
    float sheen = pow(max(0.0, 1.0 - length(p - uLight) / max(R.z, R.w) * 0.9), 2.0);
    glass += vec3(1.0, 0.97, 1.0) * sheen * 0.08 * O.z;
    // iç kostik çizgisi (kenar profili bittiği yerde) ve keskin dış kenar
    glass += vec3(1.0, 0.96, 1.0) * exp(-pow((e - B) / 1.1, 2.0)) * 0.22 * O.z;
    float side = dot(g, L2);
    glass = mix(glass, side > 0.0 ? vec3(1.0) : glass * vec3(0.72, 0.55, 0.70), exp(-pow(e / 0.9, 2.0)) * (0.55 + 0.35 * abs(side)));
    // kenar boyunca gezinen pırıltılar
    float ang = atan(p.y - c.y, p.x - c.x);
    float glint = pow(max(0.0, sin(ang * 3.0 - uTime * 0.45 + float(i))), 60.0) * exp(-e / 3.0);
    glass += vec3(1.0, 0.95, 1.0) * glint * 0.9 * O.z;
    // sayfa çevirme: cam sayfa boyunca kayan ışık bandı
    float tu = (p.x - R.x) / R.z;
    float tb = uTurn.z > 0.0 ? tu : 1.0 - tu;
    glass += vec3(1.0, 0.9, 0.98) * exp(-pow((tb - uTurn.x) / 0.07, 2.0)) * uTurn.y * step(B, e) * 0.35;

    float cov = smoothstep(0.8, -0.6, d);
    col = mix(col, glass, cov);
  }
  // çok hafif film greni (banding'i önler)
  col += (hash(p + fract(uTime)) - 0.5) / 255.0;
  o = vec4(col, 1.0);
}`;
