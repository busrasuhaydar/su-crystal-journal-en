// Project çalışma alanının ikincil bölümleri (sosyal medya, kişiler, hafıza, geçmiş).
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { History } from 'lucide-react';
import { PostList } from '../../components/PostList';
import { ConfirmButton, Field, useToast } from '../../components/ui';
import { useContacts, useInteractions, useMemory, usePosts, useProjectContacts, useProjectHistory, useRowMutation } from '../../lib/data';
import { dayKeyOf, formatLong, formatRelative, formatShort, hhmm, minutesOf, todayKey } from '../../lib/dates';
import { CONTACT_CATEGORY_LABEL, INTERACTION_LABEL, MEMORY_KIND_LABEL, type MemoryKind, type Project } from '../../lib/types';

export function SocialTab({ p }: { p: Project }) {
  const posts = usePosts({ projectId: p.id });
  return <section className="glass panel"><PostList posts={posts.data ?? []} projectId={p.id} loading={posts.isLoading} /></section>;
}

// ── Contacts ────────────────────────────────────────────
export function PeopleTab({ p }: { p: Project }) {
  const contacts = useContacts();
  const pcs = useProjectContacts();
  const inter = useInteractions({ projectId: p.id });
  const mut = useRowMutation('project_contacts', ['project_contacts']);
  const toast = useToast();
  const nav = useNavigate();
  const linked = (pcs.data ?? []).filter((x) => x.project_id === p.id);
  return (
    <div className="day-grid">
      <section className="glass panel" style={{ display: 'grid', gap: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Related contacts</h2>
          <select id="pp-link" className="select" style={{ width: 'auto' }} value="" onChange={(e) => e.target.value && mut.mutate({ op: 'insert', row: { project_id: p.id, contact_id: e.target.value } }, { onError: (x) => toast.fail(x) })}>
            <option value="">Link contact…</option>{contacts.data?.filter((c) => !linked.some((l) => l.contact_id === c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {linked.length === 0 && <p className="small muted">No linked contacts. You can add contacts from the <Link to="/contacts">Contacts</Link>page.</p>}
        {linked.map((l) => { const c = contacts.data?.find((x) => x.id === l.contact_id); return c && (
          <div key={l.id} className="task-row" onClick={() => nav('/contacts')}>
            <div className="t"><b>{c.name}</b><div className="meta"><span>{CONTACT_CATEGORY_LABEL[c.category]}</span>{c.organization && <span>{c.organization}</span>}{c.follow_up_date && <span>Follow-up: {formatRelative(c.follow_up_date)}</span>}</div></div>
            <span onClick={(e) => e.stopPropagation()}><ConfirmButton label="Remove" className="btn btn-ghost btn-sm" confirmText="Remove link?" onConfirm={() => mut.mutate({ op: 'hard_delete', id: l.id })} /></span>
          </div>
        ); })}
      </section>
      <section className="glass panel">
        <h2 style={{ marginBottom: 10 }}>Conversations about this project</h2>
        {inter.data?.length === 0 && <p className="small muted">No records.</p>}
        <div style={{ display: 'grid', gap: 8 }}>{inter.data?.map((i) => (
          <div key={i.id} className="card"><div className="small muted">{INTERACTION_LABEL[i.kind]} · {formatShort(dayKeyOf(i.occurred_at))} · {contacts.data?.find((c) => c.id === i.contact_id)?.name}</div><b style={{ fontWeight: 600 }}>{i.summary}</b></div>
        ))}</div>
      </section>
    </div>
  );
}

// ── Project memory ─────────────────────────────────────
export function MemoryTab({ p }: { p: Project }) {
  const memory = useMemory(p.id);
  const mut = useRowMutation('memory_entries', ['memory']);
  const toast = useToast();
  const [f, setF] = useState({ kind: 'decision' as MemoryKind, body: '', decided_on: todayKey(), supersedes: '' });
  const [filter, setFilter] = useState('');
  const superseded = useMemo(() => new Set((memory.data ?? []).map((m) => m.supersedes).filter(Boolean)), [memory.data]);
  const list = (memory.data ?? []).filter((m) => !filter || m.kind === filter);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.body.trim()) return toast.fail(new Error('An empty record can’t be added.'));
    try { await mut.mutateAsync({ op: 'insert', row: { project_id: p.id, kind: f.kind, body: f.body.trim(), decided_on: f.decided_on, supersedes: f.supersedes || null } }); setF({ ...f, body: '', supersedes: '' }); toast.ok('Added to memory'); }
    catch (x) { toast.fail(x); }
  }
  return (
    <div className="day-grid">
      <section className="glass panel" style={{ display: 'grid', gap: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Project memory</h2>
          <select id="m-filter" className="select" style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All records</option>{Object.entries(MEMORY_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </div>
        <p className="small muted" style={{ margin: 0 }}>Memory records can’t be changed or deleted. If a decision changes, add a new record and mark it as replacing the old one; both are kept.</p>
        {list.length === 0 && <p className="small muted">No records.</p>}
        {list.map((m) => (
          <div key={m.id} className="card" style={{ opacity: superseded.has(m.id) ? 0.55 : 1 }}>
            <div className="row small muted" style={{ justifyContent: 'space-between' }}>
              <span><span className="chip">{MEMORY_KIND_LABEL[m.kind]}</span> {formatLong(m.decided_on)}</span>
              {superseded.has(m.id) && <span>Replaced by a newer record</span>}
            </div>
            <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{m.body}</p>
            {m.supersedes && <p className="small muted" style={{ margin: '4px 0 0' }}>Replaced earlier record: “{memory.data?.find((o) => o.id === m.supersedes)?.body.slice(0, 80)}”</p>}
            {m.source.startsWith('idea:') && <p className="small muted" style={{ margin: '4px 0 0' }}>Source: Ideas notebook</p>}
          </div>
        ))}
      </section>
      <section className="glass panel">
        <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
          <h3>New record</h3>
          <Field label="Type"><select id="m-kind" className="select" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as MemoryKind })}>{Object.entries(MEMORY_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Content"><textarea id="m-body" className="textarea" style={{ minHeight: 120 }} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="e.g. The main material of the series will be glass; the resin trial was dropped." /></Field>
          <Field label="Date"><input id="m-date" type="date" className="input" value={f.decided_on} onChange={(e) => setF({ ...f, decided_on: e.target.value })} /></Field>
          <Field label="Replaces this record (optional)"><select id="m-sup" className="select" value={f.supersedes} onChange={(e) => setF({ ...f, supersedes: e.target.value })}>
            <option value="">None</option>{memory.data?.filter((m) => !superseded.has(m.id)).map((m) => <option key={m.id} value={m.id}>{MEMORY_KIND_LABEL[m.kind]}: {m.body.slice(0, 50)}</option>)}
          </select></Field>
          <button className="btn btn-primary" disabled={mut.isPending}>Add to memory</button>
        </form>
      </section>
    </div>
  );
}

// ── History (değişiklik günlüğü) ────────────────────────
const TABLE_LABEL: Record<string, string> = { projects: 'Project', tasks: 'Task', events: 'Event', social_posts: 'Content', post_targets: 'Platform', project_stages: 'Stage', notes: 'Note', memory_entries: 'Memory', interactions: 'Conversation', project_contacts: 'Contact link', ideas: 'Idea' };
function describe(r: { table_name: string; op: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  const a = r.after ?? {}, b = r.before ?? {};
  const name = String(a.title ?? a.summary ?? a.body ?? b.title ?? '').slice(0, 70);
  if (r.op === 'INSERT') return `${TABLE_LABEL[r.table_name] ?? r.table_name} added: ${name}`;
  if (r.op === 'DELETE') return `${TABLE_LABEL[r.table_name] ?? r.table_name} deleted: ${name}`;
  if (a.deleted_at && !b.deleted_at) return `${TABLE_LABEL[r.table_name] ?? r.table_name} moved to trash: ${name}`;
  if (a.status !== b.status) return `${name}: status ${String(b.status)} → ${String(a.status)}`;
  const changed = Object.keys(a).filter((k) => !['updated_at'].includes(k) && JSON.stringify(a[k]) !== JSON.stringify(b[k]));
  return `${name}: ${changed.length ? changed.join(', ') + ' changed' : 'updated'}`;
}
export function HistoryTab({ p }: { p: Project }) {
  const h = useProjectHistory(p.id);
  return (
    <section className="glass panel">
      <div className="panel-head"><h2 className="row" style={{ gap: 8 }}><History size={20} />Project history</h2><span className="small muted">Last 200 changes · with original timestamps</span></div>
      {h.data?.length === 0 && <p className="small muted">No records.</p>}
      <div style={{ display: 'grid', gap: 4 }}>
        {h.data?.map((r) => (
          <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '130px minmax(0,1fr)', gap: 10, fontSize: 13.5, padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
            <span className="mono small muted">{formatShort(dayKeyOf(r.at))} {hhmm(minutesOf(r.at))}</span>
            <span style={{ overflowWrap: 'anywhere' }}>{describe(r)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
