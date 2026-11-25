import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { createProject, migrateLegacyTasks, toDate, useProjects } from '../data/store.js';

export function dueLabel(value) {
  const d = toDate(value);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((d - today) / 86400000);
  const text = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if (days < 0) return { text: `Overdue · ${text}`, tone: 'danger' };
  if (days === 0) return { text: 'Due today', tone: 'warn' };
  if (days <= 7) return { text: `Due in ${days} day${days === 1 ? '' : 's'}`, tone: 'warn' };
  return { text: `Due ${text}`, tone: '' };
}

function NewProjectForm({ uid, onDone }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', dueDate: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const id = await createProject(uid, form);
      navigate(`/projects/${id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form className="card stack" onSubmit={submit} style={{ marginBottom: '1.5rem' }}>
      <h3>New research project</h3>
      {error && <div className="alert">{error}</div>}
      <div className="field">
        <label htmlFor="p-title">Title or research question</label>
        <input id="p-title" required autoFocus value={form.title} onChange={set('title')} placeholder="e.g. How does sleep loss affect adolescent learning?" />
      </div>
      <div className="field">
        <label htmlFor="p-desc">Description</label>
        <textarea id="p-desc" rows={2} value={form.description} onChange={set('description')} placeholder="Scope, angle, assignment details…" />
      </div>
      <div className="field" style={{ maxWidth: 220 }}>
        <label htmlFor="p-due">Due date (optional)</label>
        <input id="p-due" type="date" value={form.dueDate} onChange={set('dueDate')} />
      </div>
      <div className="row">
        <button type="submit" disabled={busy || !form.title.trim()}>{busy ? 'Creating…' : 'Create project'}</button>
        <button type="button" className="secondary" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

export default function Dashboard() {
  const { currentUser } = useAuth();
  const uid = currentUser.uid;
  const { data: projects, loading, error } = useProjects(uid);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    projects.forEach((p) => migrateLegacyTasks(uid, p));
  }, [uid, projects]);

  return (
    <div className="page">
      <div className="spread" style={{ marginBottom: '1.2rem' }}>
        <div>
          <h1>Your projects</h1>
          <p className="muted" style={{ margin: 0 }}>Each project keeps its sources, uploaded papers, citations and tasks together.</p>
        </div>
        {!creating && <button onClick={() => setCreating(true)}>+ New project</button>}
      </div>

      {creating && <NewProjectForm uid={uid} onDone={() => setCreating(false)} />}
      {error && <div className="alert">Could not load projects: {error.message}</div>}

      {loading ? (
        <p className="muted">Loading projects…</p>
      ) : projects.length === 0 && !creating ? (
        <div className="empty">
          <h3>Start your first project</h3>
          <p>A project is a research question with its own library of sources.</p>
          <button onClick={() => setCreating(true)}>+ New project</button>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((p) => {
            const due = dueLabel(p.dueDate);
            return (
              <Link key={p.id} to={`/projects/${p.id}`} className="card project-card">
                <h3>{p.title}</h3>
                {p.description && <p>{p.description}</p>}
                <div className="row" style={{ marginTop: 'auto', paddingTop: '0.4rem' }}>
                  {due && <span className={`badge ${due.tone}`}>{due.text}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
