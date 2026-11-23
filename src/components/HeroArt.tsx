// Home kahramanı: koleksiyonlardan rastgele bir eser, gerçek krom şato penceresinin ardında süzülür (Su'nun kendi çizimi), altında söz.
// Günün eserinden (ArtOfTheDay) her zaman farklıdır; ~14 sn'de bir yumuşakça başka bir esere geçer.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNfts } from '../lib/nft';
import { archUrl } from '../crystal/chrome';

export function HeroArt() {
  const nfts = useNfts();
  const items = useMemo(() => (nfts.data?.items ?? []).filter((n) => n.thumb || n.original), [nfts.data]);
  const all = nfts.data?.items ?? [];
  const day = Math.floor(Date.now() / 86_400_000);
  const artOfDay = all.length ? all[(day * 7) % all.length] : null;   // Home > ArtOfTheDay ile aynı formül
  const pick = (avoid?: string) => {
    if (!items.length) return -1;
    for (let k = 0; k < 8; k++) {
      const i = Math.floor(Math.random() * items.length), n = items[i];
      if (n !== artOfDay && n.tokenId + n.contract !== avoid) return i;
    }
    return 0;
  };
  const [idx, setIdx] = useState(-1);
  const [loaded, setLoaded] = useState<string>('');
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  useEffect(() => { if (idx < 0 && items.length) setIdx(pick()); }, [items.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (idx < 0) return;
    const off = document.documentElement.classList.contains('simple') || matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (off) return;
    const t = setInterval(() => { if (!document.hidden) setIdx((i) => pick(items[i] ? items[i].tokenId + items[i].contract : undefined)); }, 14_000);
    return () => clearInterval(t);
  }, [idx < 0, items]); // eslint-disable-line react-hooks/exhaustive-deps
  if (idx < 0 || !items[idx]) return null;
  const n = items[idx];
  const key = n.contract + n.tokenId;
  const src = failed[key] || !n.original ? n.thumb : n.original;
  const to = `/collections/${n.c}?artwork=${n.contract.slice(0, 10).toLowerCase()}-${n.tokenId}`;
  return (
    <figure className="hero-art">
      <Link to={to} className="ha-arch" aria-label={`Open ${n.name}`} title={n.name}>
        <span className="ha-win">
          {n.thumb && <img className="ha-ph" src={n.thumb} alt="" />}
          {src && <img key={key} className={`ha-img${loaded === key ? ' in' : ''}`} src={src} alt={n.name} onLoad={() => setLoaded(key)} onError={() => setFailed((f) => ({ ...f, [key]: true }))} />}
          <span className="ha-glass" />
          <span className="ha-glow" />
          <i className="ha-s a">✦</i><i className="ha-s b">✦</i><i className="ha-s c">✦</i>
        </span>
        <img className="ha-frame" src={archUrl()} alt="" aria-hidden="true" />
      </Link>
      <figcaption className="ha-quote">
        <span>“Art is the courage to imagine life more beautifully.”</span>
        <b className="script">Su ♡</b>
      </figcaption>
    </figure>
  );
}
