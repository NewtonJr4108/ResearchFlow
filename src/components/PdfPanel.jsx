import { useRef, useState } from 'react';
import { extractPdfReferences } from '../lib/api.js';
import { deletePaperUpload, savePaperUpload, saveSource, sourceId, toDate, usePapers } from '../data/store.js';
import { downloadAsPdf, MIME } from '../lib/googleDrive.js';
import { authorsShort, SaveButton } from './papers.jsx';
import DriveButton from './DriveButton.jsx';

function Confidence({ item: r }) {
  if (!r.paper) return <span className="badge danger">Not found</span>;
  if (r.confidence >= 1) return <span className="badge accent">Exact match</span>;
  return <span className="badge warn" title="Title overlap with the reference text">Likely · {Math.round(r.confidence * 100)}%</span>;
}

export default function PdfPanel({ uid, projectId, savedIds, onSearch }) {
  const { data: uploads } = usePapers(uid, projectId);
  const [selectedId, setSelectedId] = useState(null);
  const [state, setState] = useState({ busy: false, error: '', notice: '' });
  const [over, setOver] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const input = useRef(null);

  const selected = uploads.find((u) => u.id === selectedId) || (selectedId === null ? uploads[0] : null);

  const handleFile = async (file) => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      return setState({ busy: false, error: 'Choose a PDF file.', notice: '' });
    }
    if (!projectId) return setState({ busy: false, error: 'Choose a project first.', notice: '' });
    setState({ busy: true, error: '', notice: '' });
    try {
      const result = await extractPdfReferences(file);
      const { id, storageError } = await savePaperUpload(uid, projectId, file, result);
      setSelectedId(id);
      const notice = result.references.length === 0
        ? 'No reference list found. ResearchFlow looks for a “References” or “Bibliography” heading.'
        : storageError ? `References saved, but the PDF file itself couldn’t be stored (${storageError}).` : '';
      setState({ busy: false, error: '', notice });
    } catch (err) {
      setState({ busy: false, error: err.message, notice: '' });
    }
  };

  const saveAll = async () => {
    setSavingAll(true);
    try {
      const toSave = selected.references.filter((r) => r.paper && !savedIds.has(sourceId(r.paper)));
      await Promise.all(toSave.map((r) => saveSource(uid, projectId, r.paper, { origin: 'pdf', context: `Cited in ${selected.name}` })));
    } catch (err) {
      setState((s) => ({ ...s, error: err.message }));
    }
    setSavingAll(false);
  };

  const matched = selected?.references.filter((r) => r.paper) || [];
  const unsaved = matched.filter((r) => !savedIds.has(sourceId(r.paper)));

  return (
    <div className="stack">
      <div
        className={`dropzone ${over ? 'over' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => !state.busy && input.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); handleFile(e.dataTransfer.files[0]); }}
      >
        <input ref={input} type="file" accept="application/pdf" hidden onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ''; }} />
        {state.busy ? (
          <><span className="spinner" /> Reading the PDF and looking up each reference…</>
        ) : (
          <>
            <strong>Drop a paper’s PDF here</strong> or click to choose one
            <div className="small">ResearchFlow reads its reference list and finds each cited work (up to 25 MB).</div>
          </>
        )}
      </div>

      <div className="row">
        <span className="small muted">Or import from</span>
        <DriveButton
          label="Google Drive"
          className="secondary small"
          disabled={state.busy}
          mimeTypes={[MIME.pdf, MIME.doc]}
          title="Choose a paper (PDF or Google Doc)"
          onPicked={async ([file]) => {
            setState({ busy: true, error: '', notice: '' });
            let pdf;
            try {
              pdf = await downloadAsPdf(file);
            } catch (err) {
              return setState({ busy: false, error: `Couldn’t download “${file.name}” from Drive: ${err.message}`, notice: '' });
            }
            await handleFile(pdf);
          }}
        />
      </div>

      {state.error && <div className="alert">{state.error}</div>}
      {state.notice && <div className="alert warn">{state.notice}</div>}

      {uploads.length > 0 && (
        <div className="row">
          <span className="small muted">Uploaded papers:</span>
          {uploads.map((u) => (
            <button key={u.id} className={`small ${selected?.id === u.id ? '' : 'secondary'}`} onClick={() => setSelectedId(u.id)}>
              {u.name.length > 32 ? `${u.name.slice(0, 30)}…` : u.name}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="card">
          <div className="spread" style={{ marginBottom: '0.6rem' }}>
            <div>
              <h3 style={{ margin: 0 }}>
                {selected.url ? <a href={selected.url} target="_blank" rel="noreferrer">{selected.title || selected.name}</a> : (selected.title || selected.name)}
              </h3>
              <div className="small muted">
                {selected.references.length} references found · {matched.length} matched
                {selected.pages ? ` · ${selected.pages} pages` : ''}
                {toDate(selected.uploadedAt) ? ` · uploaded ${toDate(selected.uploadedAt).toLocaleDateString()}` : ''}
              </div>
            </div>
            <div className="row">
              <button className="small" onClick={saveAll} disabled={savingAll || unsaved.length === 0}>
                {savingAll ? 'Saving…' : unsaved.length ? `Save ${unsaved.length} matched to library` : 'All matched saved ✓'}
              </button>
              <button className="danger small" onClick={() => { if (window.confirm(`Remove ${selected.name} and its extracted references? Sources already in your library stay.`)) { deletePaperUpload(uid, projectId, selected); setSelectedId(null); } }}>
                Remove
              </button>
            </div>
          </div>

          {selected.references.map((r, i) => (
            <div key={i} className="ref-item">
              <div className="ref-num">{i + 1}</div>
              <div>
                <div className="ref-raw">{r.raw}</div>
                <div className="row" style={{ marginTop: '0.4rem' }}>
                  <Confidence item={r} />
                  {r.paper && (
                    <>
                      <a className="small" href={r.paper.url || `https://doi.org/${r.paper.doi}`} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                        {r.paper.title}
                      </a>
                      <span className="small muted">{[authorsShort(r.paper.authors), r.paper.year].filter(Boolean).join(' · ')}</span>
                    </>
                  )}
                </div>
                <div className="row" style={{ marginTop: '0.4rem' }}>
                  {r.paper && <SaveButton uid={uid} projectId={projectId} paper={r.paper} savedIds={savedIds} origin="pdf" context={`Cited in ${selected.name}`} />}
                  {!r.paper && onSearch && <button className="secondary small" onClick={() => onSearch(r.raw.slice(0, 200))}>Search for it</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
