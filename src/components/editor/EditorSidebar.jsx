import { useMemo, useState } from 'react';
import { suggestSources } from '../../lib/api.js';
import { saveSource, sourceId } from '../../data/store.js';
import { citationPosForSentence } from '../../editor/positions.js';
import { authorsShort } from '../papers.jsx';

const keepSelection = (e) => e.preventDefault();

function LibraryTab({ editor, sources, citedIds }) {
  const [filter, setFilter] = useState('');
  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return sources;
    return sources.filter((s) => [s.title, s.year, ...(s.authors || []).map((a) => a.family)].join(' ').toLowerCase().includes(f));
  }, [sources, filter]);

  if (sources.length === 0) {
    return <p className="small muted">Your library is empty. Use <strong>Find sources</strong>, or the Search tab, to add papers you can cite.</p>;
  }

  return (
    <>
      <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter library…" aria-label="Filter library" />
      <p className="small muted" style={{ margin: '0.5rem 0' }}>
        Put the cursor where the citation goes, then click <strong>Cite</strong>. Click a citation in the text first to add another source to it.
      </p>
      <ul className="side-list">
        {shown.map((s) => (
          <li key={s.id}>
            <div className="grow">
              <div className="side-title">{s.title}</div>
              <div className="small muted">
                {[authorsShort(s.authors), s.year].filter(Boolean).join(' · ')}
                {citedIds.has(s.id) && <span className="badge accent" style={{ marginLeft: 6 }}>cited</span>}
              </div>
            </div>
            <button className="small" onMouseDown={keepSelection} onClick={() => editor.chain().focus().cite([s.id]).run()}>Cite</button>
          </li>
        ))}
      </ul>
    </>
  );
}

function FindTab({ editor, uid, projectId, savedIds }) {
  const [state, setState] = useState({ loading: false, error: '', result: null });
  const [done, setDone] = useState({}); // `${sentenceIndex}:${paperKey}` -> true

  const run = async () => {
    const { from, to, empty, $from } = editor.state.selection;
    const text = empty ? $from.parent.textContent : editor.state.doc.textBetween(from, to, ' ');
    if (text.trim().split(/\s+/).length < 6) {
      return setState({ loading: false, error: 'Select a sentence or two, or click inside a paragraph with at least one full sentence.', result: null });
    }
    setState({ loading: true, error: '', result: null });
    setDone({});
    try {
      setState({ loading: false, error: '', result: await suggestSources(text) });
    } catch (err) {
      setState({ loading: false, error: err.message, result: null });
    }
  };

  const saveAndCite = async (sentence, paper, key) => {
    try {
      if (!savedIds.has(sourceId(paper))) await saveSource(uid, projectId, paper, { origin: 'writing', context: sentence });
      const pos = citationPosForSentence(editor.state.doc, sentence);
      const chain = editor.chain().focus();
      if (pos !== null) chain.setTextSelection(pos);
      chain.cite([sourceId(paper)]).run();
      setDone((d) => ({ ...d, [key]: true }));
    } catch (err) {
      setState((s) => ({ ...s, error: err.message }));
    }
  };

  return (
    <>
      <p className="small muted" style={{ marginTop: 0 }}>
        Select text in your paper (or click inside a paragraph), then look for published work that supports it.
      </p>
      <button onMouseDown={keepSelection} onClick={run} disabled={state.loading} style={{ width: '100%', justifyContent: 'center' }}>
        {state.loading ? <><span className="spinner" /> Searching…</> : 'Find sources for selection'}
      </button>
      {state.error && <div className="alert small" style={{ marginTop: '0.6rem' }}>{state.error}</div>}
      {state.result?.sentences.length === 0 && <p className="small muted">No sentences long enough to check (7+ words).</p>}
      {state.result?.sentences.map((s, i) => (
        <section key={i} className="side-claim">
          <div className="claim-text">“{s.sentence}”</div>
          {s.results.length === 0 && <p className="small muted">No matching papers found.</p>}
          <ul className="side-list">
            {s.results.map((paper) => {
              const key = `${i}:${paper.key}`;
              return (
                <li key={paper.key}>
                  <div className="grow">
                    <a className="side-title" href={paper.url} target="_blank" rel="noreferrer">{paper.title}</a>
                    <div className="small muted">{[authorsShort(paper.authors), paper.year, paper.citedBy != null && `${paper.citedBy} cites`].filter(Boolean).join(' · ')}</div>
                  </div>
                  <button className={`small ${done[key] ? 'saved' : ''}`} onMouseDown={keepSelection} disabled={done[key]} onClick={() => saveAndCite(s.sentence, paper, key)}>
                    {done[key] ? 'Cited ✓' : 'Save & cite'}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}

export default function EditorSidebar(props) {
  const [tab, setTab] = useState('library');
  return (
    <aside className="editor-sidebar card">
      <div className="seg" role="tablist">
        <button role="tab" aria-selected={tab === 'library'} className={tab === 'library' ? 'on' : ''} onClick={() => setTab('library')}>
          Cite from library
        </button>
        <button role="tab" aria-selected={tab === 'find'} className={tab === 'find' ? 'on' : ''} onClick={() => setTab('find')}>
          Find sources
        </button>
      </div>
      <div className="sidebar-body">
        {tab === 'library' ? <LibraryTab {...props} /> : <FindTab {...props} />}
      </div>
    </aside>
  );
}
