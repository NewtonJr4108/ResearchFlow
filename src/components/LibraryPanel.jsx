import { useMemo, useState } from 'react';
import { bibliography, cite, inText } from '../lib/citations.js';
import { removeSource, updateSource } from '../data/store.js';
import { CitationText, CopyButton, StyleSelect, authorsShort } from './papers.jsx';

const ORIGIN = { search: 'From search', writing: 'From your writing', pdf: 'From a PDF' };

function download(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

function SourceItem({ uid, projectId, source, style }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(source.note || '');
  const link = source.url || (source.doi ? `https://doi.org/${source.doi}` : null);

  const saveNote = async () => {
    await updateSource(uid, projectId, source.id, { note: note.trim() });
    setEditing(false);
  };

  return (
    <article className="card paper">
      <div className="spread" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          {link ? <a className="paper-title" href={link} target="_blank" rel="noreferrer">{source.title}</a> : <span className="paper-title">{source.title}</span>}
          <div className="paper-meta">{[authorsShort(source.authors), source.year, source.venue].filter(Boolean).join(' · ')}</div>
        </div>
        <span className="badge">{ORIGIN[source.origin] || 'Saved'}</span>
      </div>

      <CitationText paper={source} style={style} />

      {source.context && source.origin === 'writing' && (
        <p className="small muted" style={{ fontStyle: 'italic' }}>Supports: “{source.context}”</p>
      )}

      {editing ? (
        <div className="stack" style={{ marginBottom: '0.6rem' }}>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What does this source say? How will you use it?" autoFocus />
          <div className="row">
            <button className="small" onClick={saveNote}>Save note</button>
            <button className="secondary small" onClick={() => { setNote(source.note || ''); setEditing(false); }}>Cancel</button>
          </div>
        </div>
      ) : source.note ? (
        <p className="small" style={{ whiteSpace: 'pre-wrap' }}><strong>Note:</strong> {source.note}</p>
      ) : null}

      <div className="paper-actions">
        <CopyButton text={cite(source, style)} label="Copy citation" />
        {style !== 'bibtex' && <CopyButton text={inText(source, style)} label={inText(source, style)} className="ghost small" />}
        {!editing && <button className="ghost small" onClick={() => setEditing(true)}>{source.note ? 'Edit note' : 'Add note'}</button>}
        {source.pdfUrl && <a className="btn ghost small" href={source.pdfUrl} target="_blank" rel="noreferrer">Open PDF</a>}
        <button className="ghost small" style={{ marginLeft: 'auto' }} onClick={() => removeSource(uid, projectId, source.id)}>Remove</button>
      </div>
    </article>
  );
}

export default function LibraryPanel({ uid, projectId, sources, loading, style, onStyleChange, onGoTo }) {
  const [filter, setFilter] = useState('');
  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return sources;
    return sources.filter((s) => [s.title, s.venue, s.note, s.year, ...(s.authors || []).map((a) => a.family)]
      .join(' ').toLowerCase().includes(f));
  }, [sources, filter]);

  if (loading) return <p className="muted">Loading library…</p>;

  if (sources.length === 0) {
    return (
      <div className="empty">
        <h3>Your library is empty</h3>
        <p>Add sources three ways:</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button onClick={() => onGoTo('search')}>Search for papers</button>
          <button className="secondary" onClick={() => onGoTo('writing')}>Find sources for my writing</button>
          <button className="secondary" onClick={() => onGoTo('pdf')}>Extract from a PDF</button>
        </div>
      </div>
    );
  }

  const all = bibliography(sources, style);
  const ext = style === 'bibtex' ? 'bib' : 'txt';

  return (
    <div>
      <div className="toolbar">
        <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={`Filter ${sources.length} sources…`} aria-label="Filter sources" />
        <StyleSelect value={style} onChange={onStyleChange} />
        <CopyButton text={all} label="Copy bibliography" className="secondary" />
        <button className="secondary" onClick={() => download(`references.${ext}`, all)}>Download .{ext}</button>
      </div>
      {shown.length === 0 && <div className="empty">No sources match “{filter}”.</div>}
      {shown.map((s) => <SourceItem key={s.id} uid={uid} projectId={projectId} source={s} style={style} />)}
    </div>
  );
}
