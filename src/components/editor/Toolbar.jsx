import { useEditorState } from '@tiptap/react';

function Btn({ onClick, active, disabled, label, children }) {
  return (
    <button
      type="button"
      className={`tb-btn ${active ? 'active' : ''}`}
      onMouseDown={(e) => e.preventDefault()} // keep the editor's selection
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
    >
      {children}
    </button>
  );
}

const BLOCKS = [
  { id: 'p', label: 'Body text' },
  { id: 'h1', label: 'Heading 1' },
  { id: 'h2', label: 'Heading 2' },
  { id: 'h3', label: 'Heading 3' },
];

export default function Toolbar({ editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: e.isActive('heading', { level: 1 }) ? 'h1' : e.isActive('heading', { level: 2 }) ? 'h2' : e.isActive('heading', { level: 3 }) ? 'h3' : 'p',
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const setBlock = (id) => {
    const chain = editor.chain().focus();
    if (id === 'p') chain.setParagraph().run();
    else chain.setHeading({ level: Number(id[1]) }).run();
  };

  return (
    <div className="toolbar-editor" role="toolbar" aria-label="Formatting">
      <select value={s.block} onChange={(e) => setBlock(e.target.value)} aria-label="Text style">
        {BLOCKS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
      </select>
      <span className="tb-sep" />
      <Btn label="Bold (⌘B)" active={s.bold} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></Btn>
      <Btn label="Italic (⌘I)" active={s.italic} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></Btn>
      <Btn label="Underline (⌘U)" active={s.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></Btn>
      <span className="tb-sep" />
      <Btn label="Bulleted list" active={s.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</Btn>
      <Btn label="Numbered list" active={s.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</Btn>
      <Btn label="Block quote" active={s.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</Btn>
      <span className="tb-sep" />
      <Btn label="Undo (⌘Z)" disabled={!s.canUndo} onClick={() => editor.chain().focus().undo().run()}>↶</Btn>
      <Btn label="Redo (⇧⌘Z)" disabled={!s.canRedo} onClick={() => editor.chain().focus().redo().run()}>↷</Btn>
    </div>
  );
}
