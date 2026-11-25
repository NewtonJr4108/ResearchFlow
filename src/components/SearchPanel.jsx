import { useEffect, useState } from 'react';
import { searchPapers } from '../lib/api.js';
import { PaperCard, SaveButton } from './papers.jsx';

export default function SearchPanel({ uid, projectId, savedIds, style, initialQuery = '' }) {
  const [q, setQ] = useState(initialQuery);
  const [source, setSource] = useState('all');
  const [sort, setSort] = useState('relevance');
  const [fromYear, setFromYear] = useState('');
  const [state, setState] = useState({ loading: false, error: '', results: null, warnings: [] });

  const run = async (query = q) => {
    if (!query.trim()) return;
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const data = await searchPapers({ q: query.trim(), source, sort, fromYear: fromYear || undefined });
      setState({ loading: false, error: '', results: data.results, warnings: data.warnings || [] });
    } catch (err) {
      setState({ loading: false, error: err.message, results: null, warnings: [] });
    }
  };

  // Lets other panels hand over a query ("search for this reference").
  useEffect(() => {
    if (initialQuery) {
      setQ(initialQuery);
      run(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  return (
    <div>
      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); run(); }}>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search papers by topic, title, or author…" aria-label="Search query" />
        <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Source">
          <option value="all">All sources</option>
          <option value="openalex">OpenAlex (journals)</option>
          <option value="arxiv">arXiv (preprints)</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="relevance">Most relevant</option>
          <option value="citations">Most cited</option>
          <option value="recent">Newest</option>
        </select>
        <input type="number" min="1900" max="2100" value={fromYear} onChange={(e) => setFromYear(e.target.value)} placeholder="From year" aria-label="From year" style={{ width: 110, flex: 'none' }} />
        <button type="submit" disabled={state.loading || !q.trim()}>{state.loading ? <span className="spinner" /> : 'Search'}</button>
      </form>

      {state.error && <div className="alert">{state.error}</div>}
      {state.warnings.length > 0 && <div className="alert warn small" style={{ marginBottom: '0.8rem' }}>Some sources didn’t respond: {state.warnings.join('; ')}</div>}

      {state.results === null && !state.loading && !state.error && (
        <div className="empty">Search OpenAlex’s 250M+ scholarly works and arXiv preprints. Save what’s useful to your library.</div>
      )}
      {state.results?.length === 0 && <div className="empty">No papers found. Try fewer or broader words.</div>}
      {state.results?.map((paper) => (
        <PaperCard
          key={paper.key}
          paper={paper}
          style={style}
          actions={<SaveButton uid={uid} projectId={projectId} paper={paper} savedIds={savedIds} origin="search" />}
        />
      ))}
    </div>
  );
}
