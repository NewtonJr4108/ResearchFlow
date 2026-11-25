import { useEffect, useRef, useState } from 'react';
import { suggestSources } from '../lib/api.js';
import { inText } from '../lib/citations.js';
import { exportDocText, MIME } from '../lib/googleDrive.js';
import { CopyButton, PaperCard, SaveButton } from './papers.jsx';
import DriveButton from './DriveButton.jsx';

const draftKey = (projectId) => `rf-draft-${projectId || 'global'}`;

function loadDraft(projectId) {
  try {
    return localStorage.getItem(draftKey(projectId)) || '';
  } catch {
    return '';
  }
}

export default function WritingPanel({ uid, projectId, savedIds, style }) {
  const [text, setText] = useState(() => loadDraft(projectId));
  const [state, setState] = useState({ loading: false, error: '', result: null });
  const [active, setActive] = useState(0);
  const claimRefs = useRef([]);

  useEffect(() => {
    try {
      localStorage.setItem(draftKey(projectId), text);
    } catch {
      /* drafts are a convenience; ignore storage errors */
    }
  }, [projectId, text]);

  const run = async () => {
    setState({ loading: true, error: '', result: null });
    try {
      const result = await suggestSources(text);
      setState({ loading: false, error: '', result });
      setActive(0);
    } catch (err) {
      setState({ loading: false, error: err.message, result: null });
    }
  };

  const focusClaim = (i) => {
    setActive(i);
    claimRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const { result } = state;

  if (!result) {
    return (
      <div className="stack">
        <p className="muted">
          Paste a paragraph or draft. ResearchFlow looks for published work behind each claim, so you can back it up with a citation.
        </p>
        <textarea
          rows={12}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Chronic sleep deprivation in adolescents impairs working memory. Heavy social media use has also been linked to later bedtimes…"
          aria-label="Your writing"
          style={{ fontFamily: 'var(--serif)', fontSize: '1.02rem' }}
        />
        <div className="row">
          <button onClick={run} disabled={state.loading || text.trim().split(/\s+/).length < 6}>
            {state.loading ? <><span className="spinner" /> Finding sources…</> : 'Find sources for my writing'}
          </button>
          <DriveButton
            label="Import a Google Doc"
            className="secondary"
            mimeTypes={[MIME.doc]}
            title="Choose a draft to check"
            onPicked={async ([file]) => setText(await exportDocText(file))}
          />
          <span className="small muted">Checks up to 8 sentences of 7+ words. Your draft is saved in this browser.</span>
        </div>
        {state.error && <div className="alert">{state.error}</div>}
      </div>
    );
  }

  // Map each analysed sentence back onto the text so it can be highlighted in place.
  const analysed = result.sentences.map((s) => s.sentence);
  const pieces = [];
  let rest = text.replace(/\s+/g, ' ');
  analysed.forEach((sentence, i) => {
    const at = rest.indexOf(sentence);
    if (at === -1) return;
    if (at > 0) pieces.push({ text: rest.slice(0, at) });
    pieces.push({ text: sentence, index: i });
    rest = rest.slice(at + sentence.length);
  });
  if (rest) pieces.push({ text: rest });

  return (
    <div>
      <div className="spread" style={{ marginBottom: '1rem' }}>
        <span className="muted small">
          {result.sentences.length} sentence{result.sentences.length === 1 ? '' : 's'} checked
          {result.skipped > 0 && ` · ${result.skipped} more not checked (limit 8 per run)`}
        </span>
        <div className="row">
          <button className="secondary small" onClick={() => setState({ loading: false, error: '', result: null })}>Edit text</button>
          <button className="small" onClick={run} disabled={state.loading}>{state.loading ? 'Re-checking…' : 'Re-check'}</button>
        </div>
      </div>

      <div className="writing-layout">
        <div className="card writing-doc">
          <div className="rendered">
            {pieces.map((p, i) => (p.index === undefined ? (
              <span key={i}>{p.text}</span>
            ) : (
              <span
                key={i}
                role="button"
                tabIndex={0}
                className={`sentence ${result.sentences[p.index].results.length ? 'has-results' : ''} ${active === p.index ? 'active' : ''}`}
                onClick={() => focusClaim(p.index)}
                onKeyDown={(e) => e.key === 'Enter' && focusClaim(p.index)}
              >
                {p.text}
              </span>
            )))}
          </div>
          <p className="small muted" style={{ marginTop: '0.8rem', marginBottom: 0 }}>Click a highlighted sentence to see its sources.</p>
        </div>

        <div className="stack">
          {result.sentences.map((s, i) => (
            <section key={i} ref={(el) => { claimRefs.current[i] = el; }} className={`claim ${active === i ? 'active' : ''}`} onMouseEnter={() => setActive(i)}>
              <div className="claim-text">“{s.sentence}”</div>
              {s.error && <div className="alert small">{s.error}</div>}
              {!s.error && s.results.length === 0 && <p className="small muted">No matching papers found for this sentence.</p>}
              {s.results.map((paper) => (
                <PaperCard
                  key={paper.key}
                  paper={paper}
                  style={style}
                  actions={(
                    <>
                      <SaveButton uid={uid} projectId={projectId} paper={paper} savedIds={savedIds} origin="writing" context={s.sentence} />
                      {style !== 'bibtex' && <CopyButton text={inText(paper, style)} label={inText(paper, style)} className="ghost small" />}
                    </>
                  )}
                />
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
