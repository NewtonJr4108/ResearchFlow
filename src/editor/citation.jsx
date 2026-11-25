// An inline citation in the paper. It stores only source ids; the visible text
// "(Frenda & Fenn, 2016)" is computed from the project library and the current
// style, so changing style or fixing a source's details updates every citation.
import { createContext, useContext } from 'react';
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';

// { render(ids) -> string, sourcesById: Map }
export const CitationContext = createContext({ render: () => '(?)', sourcesById: new Map() });

const fallbackText = (ids) => `(${ids.length} source${ids.length === 1 ? '' : 's'})`;

// Text used when the document is serialized (getHTML for preview/export, getText).
// TipTap builds the HTML serializer from the extension's *default* storage, not
// editor.storage, so the open editor registers its renderer here instead.
// Only one paper editor is mounted at a time.
export const citationText = { render: fallbackText };

function CitationView({ node, selected }) {
  const { render, sourcesById } = useContext(CitationContext);
  const ids = node.attrs.sourceIds || [];
  const missing = ids.filter((id) => !sourcesById.has(id));
  const titles = ids.map((id) => sourcesById.get(id)?.title || 'Removed from library').join('\n');
  return (
    <NodeViewWrapper
      as="span"
      className={`cite-chip ${selected ? 'selected' : ''} ${missing.length ? 'missing' : ''}`}
      title={titles}
      data-drag-handle=""
    >
      {render(ids)}
    </NodeViewWrapper>
  );
}

export const Citation = Node.create({
  name: 'citation',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      sourceIds: {
        default: [],
        parseHTML: (el) => (el.getAttribute('data-sources') || '').split(',').filter(Boolean),
        renderHTML: (attrs) => ({ 'data-sources': (attrs.sourceIds || []).join(',') }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-citation]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-citation': '', class: 'cite' }), citationText.render(node.attrs.sourceIds || [])];
  },

  renderText({ node }) {
    return citationText.render(node.attrs.sourceIds || []);
  },

  addNodeView() {
    return ReactNodeViewRenderer(CitationView);
  },

  addCommands() {
    return {
      // Insert a citation at the cursor, or add the sources to a selected citation.
      cite: (ids) => ({ state, commands }) => {
        const selectedNode = state.selection.node;
        if (selectedNode?.type.name === this.name) {
          const merged = [...new Set([...(selectedNode.attrs.sourceIds || []), ...ids])];
          return commands.updateAttributes(this.name, { sourceIds: merged });
        }
        // Add a space before the citation unless the cursor already follows whitespace.
        const before = state.selection.$from.nodeBefore?.text?.slice(-1);
        const needsSpace = before !== undefined && !/\s/.test(before);
        return commands.insertContent([
          ...(needsSpace ? [{ type: 'text', text: ' ' }] : []),
          { type: 'citation', attrs: { sourceIds: ids } },
        ]);
      },
    };
  },
});
