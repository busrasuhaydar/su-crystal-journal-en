// Linked content: bir kayıt başka projelere/sayfalara bağlanır; kopya oluşmaz, aynı kayıt her yerde görünür.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, X } from 'lucide-react';
import { useAllPages, useEntityLinks, useFiles, useProjects, useRowMutation, useTasks } from '../../lib/data';
import type { Project } from '../../lib/types';
import { Dialog, useToast } from '../../components/ui';
import { TaskRow } from '../../components/TaskRow';
import { Thumb } from './Gallery';

export function LinkButton({ fromType, fromId, excludeProject, label = 'Link' }: { fromType: string; fromId: string; excludeProject?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const links = useEntityLinks();
  const projects = useProjects();
  const pages = useAllPages();
  const mut = useRowMutation('entity_links', ['links']);
  const toast = useToast();
  const mine = (links.data ?? []).filter((l) => l.from_type === fromType && l.from_id === fromId);
  const name = (type: string, id: string) => type === 'project' ? projects.data?.find((p) => p.id === id)?.title : `${pages.data?.find((p) => p.id === id)?.icon ?? ''} ${pages.data?.find((p) => p.id === id)?.title ?? ''}`;
  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}><Link2 size={13} />{label}{mine.length ? ` (${mine.length})` : ''}</button>
      {open && (
        <Dialog title="Linked content" onClose={() => setOpen(false)}>
          <p className="small muted" style={{ marginTop: 0 }}>This content appears as the same record everywhere it’s linked. If you change it in one place it changes everywhere.</p>
          <div className="row" style={{ marginBottom: 12 }}>
            {mine.map((l) => <span key={l.id} className="chip">{l.to_type === 'project' ? '📁' : '📄'} {name(l.to_type, l.to_id)}<button type="button" aria-label="Remove link" onClick={() => mut.mutate({ op: 'hard_delete', id: l.id })} style={{ border: 0, background: 'none', cursor: 'pointer', padding: 0 }}><X size={12} /></button></span>)}
            {!mine.length && <span className="small muted">No links yet.</span>}
          </div>
          <label className="field"><span>Link to project</span>
            <select id="lk-proj" className="select" value="" onChange={(e) => e.target.value && mut.mutate({ op: 'insert', row: { from_type: fromType, from_id: fromId, to_type: 'project', to_id: e.target.value } }, { onSuccess: () => toast.ok('Linked'), onError: (x) => toast.fail(x) })}>
              <option value="">Choose project…</option>
              {projects.data?.filter((p) => p.id !== excludeProject && !mine.some((l) => l.to_id === p.id)).map((p) => <option key={p.id} value={p.id}>{p.icon ?? '✦'} {p.title}</option>)}
            </select>
          </label>
          <label className="field" style={{ marginTop: 10 }}><span>Link to page</span>
            <select id="lk-page" className="select" value="" onChange={(e) => e.target.value && mut.mutate({ op: 'insert', row: { from_type: fromType, from_id: fromId, to_type: 'page', to_id: e.target.value } }, { onSuccess: () => toast.ok('Linked'), onError: (x) => toast.fail(x) })}>
              <option value="">Choose page…</option>
              {pages.data?.filter((pg) => pg.id !== fromId && !mine.some((l) => l.to_id === pg.id)).map((pg) => <option key={pg.id} value={pg.id}>{projects.data?.find((p) => p.id === pg.project_id)?.title} › {pg.icon} {pg.title}</option>)}
            </select>
          </label>
        </Dialog>
      )}
    </>
  );
}

/** Another yerlerden bu projeye bağlanmış içerikler. */
export function LinkedIn({ p }: { p: Project }) {
  const links = useEntityLinks();
  const tasks = useTasks();
  const files = useFiles();
  const pages = useAllPages();
  const projects = useProjects();
  const nav = useNavigate();
  const incoming = (links.data ?? []).filter((l) => l.to_type === 'project' && l.to_id === p.id);
  if (!incoming.length) return null;
  return (
    <section className="glass panel" style={{ display: 'grid', gap: 10 }}>
      <h2 className="row" style={{ gap: 8 }}><Link2 size={18} />Linked content</h2>
      <p className="small muted" style={{ margin: 0 }}>Records linked to this project from other projects. They are the originals, not copies.</p>
      {incoming.map((l) => {
        if (l.from_type === 'task') { const t = tasks.data?.find((x) => x.id === l.from_id); return t ? <TaskRow key={l.id} task={t} /> : null; }
        if (l.from_type === 'file') { const f = files.data?.find((x) => x.id === l.from_id); return f ? <div key={l.id} className="row card"><div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden' }}><Thumb file={f} /></div><b className="small">{f.title}</b></div> : null; }
        if (l.from_type === 'page') {
          const pg = pages.data?.find((x) => x.id === l.from_id); const pr = projects.data?.find((x) => x.id === pg?.project_id);
          return pg && pr ? <button type="button" key={l.id} className="task-row" style={{ textAlign: 'left', border: '1px solid var(--glass-edge)' }} onClick={() => nav(`/projects/${pr.slug}/pages/${pg.id}`)}><b>{pg.icon} {pg.title}</b><span className="small muted">· {pr.title}</span></button> : null;
        }
        return null;
      })}
    </section>
  );
}
