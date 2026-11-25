import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import { Citation, CitationContext, citationText } from '../../editor/citation.jsx';
import { DOC_STYLES, citedIdsInOrder, inTextGroup } from '../../lib/citations.js';
import { loadDraft, saveDraft } from '../../data/store.js';
import { exportDocHtml, MIME } from '../../lib/googleDrive.js';
import DriveButton from '../DriveButton.jsx';
import Toolbar from './Toolbar.jsx';
import EditorSidebar from './EditorSidebar.jsx';
import PaperPreview, { PAPER_CSS, standaloneHtml } from './PaperPreview.jsx';

const SAVE_DELAY_MS = 1200;
const STATUS = { saved: 'All changes saved', saving: 'Saving…', unsaved: 'Unsaved changes', loading: 'Loading…' };

function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

const safeName = (s) => (s || 'paper').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'paper';

export default function WritePanel({ uid, projectId, project, sources, savedIds, style: globalStyle, onStyleChange }) {
  const style = DOC_STYLES.some((s) => s.id === globalStyle) ? globalStyle : 'apa';
  const [mode, setMode] = useState('write');
  const [title, setTitle] = useState('');
  const [byline, setByline] = useState('');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [citedOrder, setCitedOrder] = useState([]);
  const pageRef = useRef(null);
  const timer = useRef(null);
  const latest = useRef({ title: '', byline: '' });
  latest.current = { title, byline };

  const sourcesById = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true }, code: false, codeBlock: false }),
      Placeholder.configure({ placeholder: 'Start writing your paper… Use the panel on the right to cite sources.' }),
      CharacterCount,
      Citation,
    ],
    editable: false,
    editorProps: { attributes: { class: 'paper-editor', spellcheck: 'true', 'aria-label': 'Paper text' } },
  });

  /* --------------------------- Saving ---------------------------- */

  const saveNow = useCallback(async () => {
    clearTimeout(timer.current);
    timer.current = null;
    if (!editor || editor.isDestroyed) return;
    setStatus('saving');
    try {
      await saveDraft(uid, projectId, {
        ...latest.current,
        content: editor.getJSON(),
        words: editor.storage.characterCount.words(),
      });
      setStatus((s) => (timer.current ? s : 'saved'));
      setError('');
    } catch (err) {
      setStatus('unsaved');
      setError(`Couldn’t save: ${err.message}`);
    }
  }, [editor, uid, projectId]);

  const scheduleSave = useCallback(() => {
    setStatus('unsaved');
    clearTimeout(timer.current);
    timer.current = setTimeout(saveNow, SAVE_DELAY_MS);
  }, [saveNow]);

  /* ---------------------------- Loading -------------------------- */

  useEffect(() => {
    if (!editor) return undefined;
    let cancelled = false;
    setStatus('loading');
    loadDraft(uid, projectId)
      .then((draft) => {
        if (cancelled) return;
        setTitle(draft?.title ?? project.title ?? '');
        setByline(draft?.byline ?? '');
        if (draft?.content) editor.commands.setContent(draft.content, { emitUpdate: false });
        setCitedOrder(citedIdsInOrder(editor.getJSON()));
        editor.setEditable(true);
        setStatus('saved');
      })
      .catch((err) => {
        if (!cancelled) {
          setError(`Couldn’t load your paper: ${err.message}`);
          setStatus('unsaved');
        }
      });
    return () => { cancelled = true; };
    // project.title is only the default for a brand-new paper
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, uid, projectId]);

  useEffect(() => {
    if (!editor) return undefined;
    const onUpdate = () => {
      setCitedOrder(citedIdsInOrder(editor.getJSON()));
      scheduleSave();
    };
    editor.on('update', onUpdate);
    return () => editor.off('update', onUpdate);
  }, [editor, scheduleSave]);

  // Save pending changes when leaving the tab; warn before closing the window.
  useEffect(() => {
    const warn = (e) => {
      if (timer.current) {
        saveNow();
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
      if (timer.current) saveNow();
    };
  }, [saveNow]);

  /* --------------------------- Citations ------------------------- */

  const renderCitation = useCallback((ids) => {
    const papers = ids.map((id) => sourcesById.get(id)).filter(Boolean);
    return inTextGroup(papers, style, (p) => citedOrder.indexOf(p.id) + 1);
  }, [sourcesById, style, citedOrder]);

  // getHTML() (preview, export) and getText() use the shared serializer hook.
  citationText.render = renderCitation;
  const citationCtx = useMemo(() => ({ render: renderCitation, sourcesById }), [renderCitation, sourcesById]);

  const citedSources = citedOrder.map((id) => sourcesById.get(id)).filter(Boolean);
  const missingCount = citedOrder.length - citedSources.length;

  const words = useEditorState({ editor, selector: ({ editor: e }) => e?.storage.characterCount.words() ?? 0 });

  /* ---------------------------- Actions -------------------------- */

  const importDoc = async ([file]) => {
    const html = await exportDocHtml(file);
    if (!editor.isEmpty && !window.confirm(`Replace your current text with “${file.name}”? Your citations in the current text will be lost.`)) return;
    editor.commands.setContent(html);
    if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ''));
  };

  // The export is built from the rendered preview, so switch to it first and
  // wait until it's on the page.
  const exportHtml = () => {
    setMode('preview');
    const started = Date.now();
    (function waitForPage() {
      if (pageRef.current) {
        download(`${safeName(title)}.html`, standaloneHtml(title, pageRef.current.outerHTML), 'text/html;charset=utf-8');
      } else if (Date.now() - started < 2000) {
        setTimeout(waitForPage, 30);
      }
    })();
  };

  const printPdf = () => {
    setMode('preview');
    saveNow();
    const started = Date.now();
    (function waitForPage() {
      if (pageRef.current) window.print();
      else if (Date.now() - started < 2000) setTimeout(waitForPage, 30);
    })();
  };

  if (!editor) return <p className="muted">Loading editor…</p>;

  return (
    <CitationContext.Provider value={citationCtx}>
      <style>{PAPER_CSS}</style>
      <div className="write-bar">
        <div className="seg" role="tablist" aria-label="View">
          <button role="tab" aria-selected={mode === 'write'} className={mode === 'write' ? 'on' : ''} onClick={() => setMode('write')}>Write</button>
          <button role="tab" aria-selected={mode === 'preview'} className={mode === 'preview' ? 'on' : ''} onClick={() => { setMode('preview'); saveNow(); }}>Preview</button>
        </div>
        <select value={style} onChange={(e) => onStyleChange(e.target.value)} aria-label="Citation style">
          {DOC_STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <span className="small muted">{words.toLocaleString()} words · {citedSources.length} cited</span>
        <span className={`small save-status ${status}`} role="status">{STATUS[status]}</span>
        <span className="grow" />
        <DriveButton label="Import Google Doc" className="secondary small" mimeTypes={[MIME.doc]} title="Import a draft" onPicked={importDoc} />
        <button className="secondary small" onClick={exportHtml}>Download HTML</button>
        <button className="small" onClick={printPdf}>Print / PDF</button>
      </div>

      {error && <div className="alert" style={{ marginBottom: '0.8rem' }}>{error}</div>}
      {missingCount > 0 && (
        <div className="alert warn small" style={{ marginBottom: '0.8rem' }}>
          {missingCount} cited source{missingCount === 1 ? ' was' : 's were'} removed from the library. Those citations are highlighted in red.
        </div>
      )}

      {mode === 'write' ? (
        <div className="paper-layout">
          <div className="paper-sheet">
            <input className="paper-title-input" value={title} onChange={(e) => { setTitle(e.target.value); scheduleSave(); }} placeholder="Paper title" aria-label="Paper title" />
            <textarea className="paper-byline-input" rows={2} value={byline} onChange={(e) => { setByline(e.target.value); scheduleSave(); }} placeholder={'Your name\nCourse · Instructor · Date'} aria-label="Author and course details" />
            <Toolbar editor={editor} />
            <EditorContent editor={editor} />
          </div>
          <EditorSidebar
            editor={editor}
            uid={uid}
            projectId={projectId}
            sources={sources}
            savedIds={savedIds}
            citedIds={new Set(citedOrder)}
          />
        </div>
      ) : (
        <div className="preview-wrap">
          <PaperPreview ref={pageRef} title={title} byline={byline} html={editor.getHTML()} citedSources={citedSources} style={style} />
        </div>
      )}
    </CitationContext.Provider>
  );
}
