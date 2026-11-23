import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckSquare, ExternalLink, FileText, Lightbulb, Search, Shuffle } from 'lucide-react';
import { PagesTab } from './project/Pages';
import { useAllPages, useIdeas, useProjects, useTasks } from '../lib/data';
import { PageHead } from '../components/Shell';
import { Card, Lightbox, nftKey } from '../components/NftLightbox';
import { useEnsureCollectionProjects, useNfts, type Nft, type NftData as Data } from '../lib/nft';
import { Empty } from '../components/ui';

const norm = (s: string) => s.toLocaleLowerCase('en');
const key = nftKey;

export default function NftCollectionsPage() {
  const { slug } = useParams();
  const data = useNfts();
  useEnsureCollectionProjects();
  if (data.isLoading) return <><PageHead title="My Collections" /><p className="muted">Loading…</p></>;
  if (!data.data) return <Empty title="Couldn’t load data">Refresh the page.</Empty>;
  return slug ? <CollectionView data={data.data} slug={slug} /> : <Overview data={data.data} />;
}

function Overview({ data }: { data: Data }) {
  const [q, setQ] = useState('');
  const [lb, setLb] = useState<number | null>(null);
  const by = useMemo(() => { const m = new Map<string, Nft[]>(); data.items.forEach((i) => m.set(i.c, [...(m.get(i.c) ?? []), i])); return m; }, [data]);
  const found = useMemo(() => { const t = norm(q.trim()); return t ? data.items.filter((n) => norm(`${n.name} ${n.description}`).includes(t)) : []; }, [q, data]);
  const sr = data.items.filter((i) => i.superrare).length;
  function surprise() { const i = Math.floor(Math.random() * data.items.length); setQ(''); setLb(-1 - i); }
  const lbItems = lb != null && lb < 0 ? data.items : found;
  const lbIndex = lb == null ? 0 : lb < 0 ? -1 - lb : lb;
  return (
    <>
      <PageHead title="My Collections">
        <div className="row" style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, color: 'var(--ink-500)' }} />
          <input className="input" style={{ paddingLeft: 34, width: 260 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all artworks…" />
        </div>
        <button type="button" className="btn btn-glass btn-sm" onClick={surprise}><Shuffle size={14} />Surprise me</button>
        <a className="btn btn-glass btn-sm" href="https://opensea.io/busrasuhaydar" target="_blank" rel="noreferrer" title="My OpenSea profile">OS <ExternalLink size={13} /></a>
        <a className="btn btn-glass btn-sm" href="https://superrare.com/busrasuhaydar" target="_blank" rel="noreferrer" title="My SuperRare profile">SR <ExternalLink size={13} /></a>
      </PageHead>
      <div className="row">
        {data.collections.map((c) => <Link key={c.slug} className="chip" to={`/collections/${c.slug}`}>{c.name} · {by.get(c.slug)?.length ?? 0}</Link>)}
      </div>
      <div className="stat-row">
        <div className="stat"><b>{data.items.length}</b><span>Artwork</span></div>
        <div className="stat"><b>{data.collections.length}</b><span>Collection</span></div>
        <div className="stat"><b>{sr}</b><span>on SuperRare</span></div>
      </div>
      {q.trim() ? (
        <section className="glass panel">
          <div className="panel-head"><h2>Search results</h2><span className="count">{found.length}</span></div>
          {found.length === 0 ? <Empty title="No results">Try another word.</Empty> : <div className="nft-grid">{found.map((n, i) => <Card key={key(n)} n={n} onOpen={() => setLb(i)} />)}</div>}
        </section>
      ) : (
        <div className="col-grid">
          {data.collections.map((c) => {
            const list = by.get(c.slug) ?? [];
            const pv = [0, 1, 2, 3].map((k) => list[Math.floor((list.length / 4) * k)]).filter(Boolean);
            return (
              <Link key={c.slug} to={`/collections/${c.slug}`} className="col-card glass">
                <div className={`mosaic m${pv.length}`}>{pv.map((p, k) => <img key={`${key(p)}-${k}`} src={p.thumb ?? ''} alt="" loading="lazy" />)}</div>
                <div className="col-meta">
                  <h3>{c.name}</h3>
                  <span className="small muted">{list.length}artworks{list.some((l) => l.superrare) ? ' · SuperRare' : ''}</span>
                  {c.description && <p className="small muted col-d">{c.description.replace(/\s+/g, ' ')}</p>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {lb != null && lbItems.length > 0 && <Lightbox items={lbItems} index={lbIndex} setIndex={(i) => setLb(lb < 0 ? -1 - i : i)} onClose={() => setLb(null)} />}
    </>
  );
}

function CollectionView({ data, slug }: { data: Data; slug: string }) {
  const col = data.collections.find((c) => c.slug === slug);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'no' | 'ad' | 'son'>('no');
  const [sp, setSp] = useSearchParams();
  const projects = useProjects();
  const proj = projects.data?.find((p) => p.slug === `koleksiyon-${slug}`);
  const tasks = useTasks().data, ideas = useIdeas().data, allPages = useAllPages().data;
  const openTasks = proj ? (tasks ?? []).filter((t) => t.project_id === proj.id && ['todo', 'doing', 'postponed'].includes(t.status)).length : 0;
  const ideaCount = proj ? (ideas ?? []).filter((i) => i.project_id === proj.id && i.status !== 'archived').length : 0;
  const pageCount = proj ? (allPages ?? []).filter((x) => x.project_id === proj.id).length : 0;
  const tab = sp.get('tab') === 'pages' ? 'pages' : 'artworks';
  const setTab = (t: string) => { const n = new URLSearchParams(sp); n.delete('artwork'); n.delete('page'); if (t === 'pages') n.set('tab', t); else n.delete('tab'); setSp(n, { replace: true }); };
  const list = useMemo(() => {
    let l = data.items.filter((i) => i.c === slug);
    const t = norm(q.trim());
    if (t) l = l.filter((n) => norm(`${n.name} ${n.description}`).includes(t));
    const num = (n: Nft) => Number(n.tokenId) || 0;
    return [...l].sort(sort === 'ad' ? (a, b) => a.name.localeCompare(b.name, 'en') : sort === 'son' ? (a, b) => num(b) - num(a) : (a, b) => num(a) - num(b));
  }, [data, slug, q, sort]);
  const open = sp.get('artwork');
  const idx = open ? list.findIndex((n) => n.tokenId === open.split('-').pop() && n.contract.toLowerCase().startsWith(open.split('-')[0])) : -1;
  const setOpen = (i: number | null) => { const n = new URLSearchParams(sp); if (i == null) n.delete('artwork'); else n.set('artwork', `${list[i].contract.slice(0, 10).toLowerCase()}-${list[i].tokenId}`); setSp(n, { replace: true }); };
  if (!col) return <Empty title="Collection not found"><Link to="/collections">Back to collections</Link></Empty>;
  return (
    <>
      <PageHead title={col.name}>
        <Link className="btn btn-glass btn-sm" to="/collections"><ArrowLeft size={14} />All collections</Link>
        <Link className="btn btn-glass btn-sm" to={`/projects/koleksiyon-${slug}`}>Project workspace</Link>
      </PageHead>
      <div className="row">
        {data.collections.map((c) => <Link key={c.slug} className={`chip${c.slug === slug ? ' chip-on' : ''}`} to={`/collections/${c.slug}`}>{c.name}</Link>)}
      </div>
      {proj && <div className="row" style={{ gap: 8 }}>
        <Link className="chip chip-on-soft" to={`/projects/${proj.slug}/tasks`}><CheckSquare size={12} />{openTasks} open tasks</Link>
        <Link className="chip chip-on-soft" to="/ideas"><Lightbulb size={12} />{ideaCount} ideas</Link>
        <button type="button" className="chip chip-on-soft" onClick={() => setTab('pages')} style={{ cursor: 'pointer', border: 0 }}><FileText size={12} />{pageCount} pages</button>
      </div>}
      <div className="seg" style={{ justifySelf: 'start' }}>
        <button type="button" className={tab === 'artworks' ? 'on' : ''} onClick={() => setTab('artworks')}>Eserler · {list.length}</button>
        <button type="button" className={tab === 'pages' ? 'on' : ''} onClick={() => setTab('pages')}>Pages & ideas</button>
      </div>
      {tab === 'pages' ? (
        proj ? <PagesTab p={proj} initialPage={sp.get('page') ?? undefined} onOpenPage={(id) => { const n = new URLSearchParams(sp); if (id) n.set('page', id); else n.delete('page'); setSp(n, { replace: true }); }} />
          : <p className="muted">Preparing collection project…</p>
      ) : (
      <section className="glass panel">
        {col.description && <p className="col-desc">{col.description}</p>}
        <div className="row" style={{ marginBottom: 14 }}>
          <div className="row" style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, color: 'var(--ink-500)' }} />
            <input className="input" style={{ paddingLeft: 34, width: 240 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search this collection…" />
          </div>
          <div className="seg">{([['no', 'Oldest first'], ['son', 'Newest first'], ['ad', 'A–Z']] as const).map(([v, l]) => <button key={v} type="button" className={sort === v ? 'on' : ''} onClick={() => setSort(v)}>{l}</button>)}</div>
          <span className="count">{list.length}</span>
        </div>
        {list.length === 0 ? <Empty title="No results">Change your search.</Empty> : <div className="nft-grid">{list.map((n, i) => <Card key={key(n)} n={n} onOpen={() => setOpen(i)} />)}</div>}
      </section>
      )}
      {idx >= 0 && <Lightbox items={list} index={idx} setIndex={(i) => setOpen(i)} onClose={() => setOpen(null)} />}
    </>
  );
}
