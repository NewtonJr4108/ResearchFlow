import { useEffect, useMemo } from 'react';
import { Link, NavLink, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useProject, useProjects, useSources } from '../data/store.js';
import LibraryPanel from '../components/LibraryPanel.jsx';
import SearchPanel from '../components/SearchPanel.jsx';
import WritingPanel from '../components/WritingPanel.jsx';
import PdfPanel from '../components/PdfPanel.jsx';
import OverviewPanel from '../components/OverviewPanel.jsx';
import FilesPanel from '../components/FilesPanel.jsx';
import WritePanel from '../components/editor/WritePanel.jsx';
import { dueLabel } from './Dashboard.jsx';

const LAST_PROJECT = 'rf-last-project';

function remember(projectId) {
  try {
    localStorage.setItem(LAST_PROJECT, projectId);
  } catch {
    /* ignore */
  }
}

function recall() {
  try {
    return localStorage.getItem(LAST_PROJECT);
  } catch {
    return null;
  }
}

const TABS = [
  { id: 'library', label: 'Library' },
  { id: 'write', label: 'Write paper' },
  { id: 'search', label: 'Search papers' },
  { id: 'writing', label: 'Sources for my writing' },
  { id: 'pdf', label: 'References from a PDF' },
  { id: 'files', label: 'Files' },
  { id: 'overview', label: 'Tasks & notes' },
];

export default function Workspace() {
  const { projectId, tab = 'library' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, citationStyle, updateSettings } = useAuth();
  const uid = currentUser.uid;
  const { data: project, loading, error } = useProject(uid, projectId);
  const { data: sources, loading: sourcesLoading } = useSources(uid, projectId);
  const savedIds = useMemo(() => new Set(sources.map((s) => s.id)), [sources]);

  useEffect(() => {
    if (project) remember(project.id);
  }, [project]);

  if (loading) return <div className="page-loading">Loading project…</div>;
  if (error) return <div className="page"><div className="alert">Could not load this project: {error.message}</div></div>;
  if (!project) {
    return (
      <div className="page">
        <div className="empty"><h3>Project not found</h3><p>It may have been deleted.</p><Link to="/dashboard">Back to projects</Link></div>
      </div>
    );
  }
  if (!TABS.some((t) => t.id === tab)) return <Navigate to={`/projects/${projectId}`} replace />;

  const go = (t, query) => navigate(`/projects/${projectId}/${t}${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  const due = dueLabel(project.dueDate);
  const panelProps = { uid, projectId, savedIds, style: citationStyle };

  return (
    <div className={`page ${tab === 'write' ? 'wide' : ''}`}>
      <header className="workspace-head">
        <div className="small"><Link to="/dashboard">← Projects</Link></div>
        <div className="title-row">
          <h1 style={{ marginTop: '0.3rem' }}>{project.title}</h1>
          {due && <span className={`badge ${due.tone}`} style={{ marginTop: '0.8rem' }}>{due.text}</span>}
        </div>
        {project.description && <p className="muted" style={{ maxWidth: 760 }}>{project.description}</p>}
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <NavLink key={t.id} to={`/projects/${projectId}/${t.id}`} className={() => (t.id === tab ? 'active' : '')} end>
            {t.label}
            {t.id === 'library' && <span className="count">{sources.length}</span>}
          </NavLink>
        ))}
      </nav>

      {tab === 'library' && (
        <LibraryPanel
          {...panelProps}
          sources={sources}
          loading={sourcesLoading}
          onStyleChange={(s) => updateSettings({ citationStyle: s })}
          onGoTo={go}
        />
      )}
      {tab === 'write' && (
        <WritePanel
          {...panelProps}
          project={project}
          sources={sources}
          onStyleChange={(s) => updateSettings({ citationStyle: s })}
        />
      )}
      {tab === 'search' && <SearchPanel {...panelProps} initialQuery={params.get('q') || project.title} key={params.get('q') || ''} />}
      {tab === 'writing' && <WritingPanel {...panelProps} />}
      {tab === 'pdf' && <PdfPanel {...panelProps} onSearch={(q) => go('search', q)} />}
      {tab === 'files' && <FilesPanel uid={uid} projectId={projectId} />}
      {tab === 'overview' && <OverviewPanel uid={uid} project={project} />}
    </div>
  );
}

// "Research" in the navbar: jump into the most recent project's search tab.
export function ResearchRedirect() {
  const { currentUser } = useAuth();
  const { data: projects, loading } = useProjects(currentUser.uid);
  if (loading) return <div className="page-loading">Loading…</div>;
  if (projects.length === 0) {
    return (
      <div className="page">
        <div className="empty">
          <h3>Research happens inside a project</h3>
          <p>Create a project for your research question, then search, analyse your writing, and pull references from PDFs into it.</p>
          <Link className="btn" to="/dashboard">Create a project</Link>
        </div>
      </div>
    );
  }
  const last = recall();
  const target = projects.find((p) => p.id === last) || projects[0];
  return <Navigate to={`/projects/${target.id}/search`} replace />;
}
