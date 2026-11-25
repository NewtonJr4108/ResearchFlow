import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addTask, deleteProject, deleteTask, setTaskDone, toDate, toInputDate, updateProject, useTasks } from '../data/store.js';

function Tasks({ uid, projectId }) {
  const { data: tasks } = useTasks(uid, projectId);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

  const add = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await addTask(uid, projectId, { title, dueDate });
      setTitle('');
      setDueDate('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card">
      <h3>Tasks</h3>
      {tasks.length === 0 && <p className="small muted">No tasks yet. Break the project into steps: outline, find 10 sources, first draft…</p>}
      {tasks.map((t) => (
        <div key={t.id} className={`task ${t.done ? 'done' : ''}`}>
          <input type="checkbox" checked={!!t.done} onChange={(e) => setTaskDone(uid, projectId, t.id, e.target.checked)} aria-label={`Mark ${t.title} done`} />
          <span className="task-title grow">{t.title}</span>
          {toDate(t.dueDate) && <span className="small muted">{toDate(t.dueDate).toLocaleDateString()}</span>}
          <button className="ghost small" onClick={() => deleteTask(uid, projectId, t.id)} aria-label={`Delete ${t.title}`}>✕</button>
        </div>
      ))}
      <form className="row" onSubmit={add} style={{ marginTop: '0.8rem' }}>
        <input className="grow" style={{ width: 'auto' }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task" aria-label="Task title" />
        <input type="date" style={{ width: 'auto' }} value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label="Task due date" />
        <button type="submit" disabled={!title.trim()}>Add</button>
      </form>
      {error && <div className="alert" style={{ marginTop: '0.5rem' }}>{error}</div>}
    </div>
  );
}

function Details({ uid, project }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  const start = () => {
    setForm({
      title: project.title || '',
      description: project.description || '',
      dueDate: toInputDate(project.dueDate),
      notes: project.notes || '',
      links: (project.links || []).join('\n'),
    });
    setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await updateProject(uid, project.id, {
        ...form,
        title: form.title.trim(),
        links: form.links.split(/[\n,]+/).map((l) => l.trim()).filter(Boolean),
      });
      setEditing(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete “${project.title}”? Its tasks, saved sources and uploaded PDFs will be permanently deleted.`)) return;
    await deleteProject(uid, project.id);
    navigate('/dashboard');
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (editing) {
    return (
      <form className="card stack" onSubmit={save}>
        <h3>Edit project</h3>
        {error && <div className="alert">{error}</div>}
        <div className="field"><label htmlFor="e-title">Title</label><input id="e-title" required value={form.title} onChange={set('title')} /></div>
        <div className="field"><label htmlFor="e-desc">Description</label><textarea id="e-desc" rows={3} value={form.description} onChange={set('description')} /></div>
        <div className="field" style={{ maxWidth: 220 }}><label htmlFor="e-due">Due date</label><input id="e-due" type="date" value={form.dueDate} onChange={set('dueDate')} /></div>
        <div className="field"><label htmlFor="e-notes">Notes</label><textarea id="e-notes" rows={5} value={form.notes} onChange={set('notes')} /></div>
        <div className="field"><label htmlFor="e-links">Links (one per line)</label><textarea id="e-links" rows={3} value={form.links} onChange={set('links')} /></div>
        <div className="row">
          <button type="submit" disabled={!form.title.trim()}>Save</button>
          <button type="button" className="secondary" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div className="card stack">
      <div className="spread">
        <h3 style={{ margin: 0 }}>Notes & links</h3>
        <div className="row">
          <button className="secondary small" onClick={start}>Edit project</button>
          <button className="danger small" onClick={remove}>Delete project</button>
        </div>
      </div>
      {project.notes ? <p style={{ whiteSpace: 'pre-wrap' }}>{project.notes}</p> : <p className="small muted">No notes yet.</p>}
      {project.links?.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {project.links.map((l, i) => <li key={i}><a href={l} target="_blank" rel="noreferrer">{l}</a></li>)}
        </ul>
      )}
    </div>
  );
}

export default function OverviewPanel({ uid, project }) {
  return (
    <div className="stack">
      <Tasks uid={uid} projectId={project.id} />
      <Details uid={uid} project={project} />
    </div>
  );
}
