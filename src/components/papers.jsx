import { useState } from 'react';
import { STYLES, cite, format, inText } from '../lib/citations.js';
import { saveSource, sourceId } from '../data/store.js';

export function authorsShort(authors = []) {
  const fams = authors.map((a) => a.family || a.given).filter(Boolean);
  if (fams.length === 0) return 'Unknown authors';
  if (fams.length <= 3) return fams.join(', ');
  return `${fams.slice(0, 3).join(', ')} et al.`;
}

export function CitationText({ paper, style }) {
  const segments = format(paper, style);
  return (
    <div className={`citation ${style === 'bibtex' ? 'bibtex' : ''}`}>
      {segments.map(([text, italic], i) => (italic ? <i key={i}>{text}</i> : <span key={i}>{text}</span>))}
    </div>
  );
}

export function CopyButton({ text, label = 'Copy', className = 'secondary small' }) {
  const [state, setState] = useState('idle');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('done');
    } catch {
      setState('failed');
    }
    setTimeout(() => setState('idle'), 1500);
  };
  return (
    <button type="button" className={className} onClick={copy}>
      {state === 'done' ? 'Copied ✓' : state === 'failed' ? 'Copy failed' : label}
    </button>
  );
}

export function StyleSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Citation style">
      {STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
    </select>
  );
}

// Save-to-project button that knows whether the paper is already in the library.
export function SaveButton({ uid, projectId, paper, savedIds, origin, context }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const saved = savedIds?.has(sourceId(paper));
  if (!projectId) return <button className="secondary small" disabled title="Choose a project first">Save</button>;
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveSource(uid, projectId, paper, { origin, context });
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };
  return (
    <>
      <button className={`small ${saved ? 'saved' : ''}`} onClick={save} disabled={busy || saved}>
        {saved ? 'In library ✓' : busy ? 'Saving…' : '+ Save to library'}
      </button>
      {error && <span className="small" style={{ color: 'var(--danger)' }}>{error}</span>}
    </>
  );
}

export function PaperCard({ paper, style = 'apa', actions, children, defaultOpen = false }) {
  const [showAbstract, setShowAbstract] = useState(defaultOpen);
  const [showCite, setShowCite] = useState(false);
  const meta = [authorsShort(paper.authors), paper.year, paper.venue].filter(Boolean).join(' · ');
  const link = paper.url || (paper.doi ? `https://doi.org/${paper.doi}` : null);

  return (
    <article className="card paper">
      <div className="spread" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          {link ? (
            <a className="paper-title" href={link} target="_blank" rel="noreferrer">{paper.title}</a>
          ) : (
            <span className="paper-title">{paper.title}</span>
          )}
          <div className="paper-meta">{meta}</div>
        </div>
        <div className="row" style={{ gap: '0.3rem' }}>
          {paper.citedBy != null && <span className="badge" title="Times cited">{paper.citedBy.toLocaleString()} cites</span>}
          {paper.type === 'preprint' && <span className="badge warn">Preprint</span>}
          {paper.pdfUrl && <a className="badge accent" href={paper.pdfUrl} target="_blank" rel="noreferrer">PDF</a>}
        </div>
      </div>

      {paper.abstract && showAbstract && <p className="paper-abstract">{paper.abstract}</p>}
      {showCite && (
        <>
          <CitationText paper={paper} style={style} />
          <div className="row small" style={{ marginBottom: '0.5rem' }}>
            <CopyButton text={cite(paper, style)} label="Copy citation" />
            {style !== 'bibtex' && <CopyButton text={inText(paper, style)} label={`Copy ${inText(paper, style)}`} />}
          </div>
        </>
      )}
      {children}

      <div className="paper-actions">
        {actions}
        <button className="ghost small" onClick={() => setShowCite((v) => !v)}>{showCite ? 'Hide citation' : 'Cite'}</button>
        {paper.abstract && (
          <button className="ghost small" onClick={() => setShowAbstract((v) => !v)}>
            {showAbstract ? 'Hide abstract' : 'Abstract'}
          </button>
        )}
      </div>
    </article>
  );
}
