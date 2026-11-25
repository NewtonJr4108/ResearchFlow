// Map between plain text and ProseMirror document positions, so a sentence
// returned by the server can be located in the document again.

// Text of a textblock, counting only text nodes (citations and other atoms add nothing).
export function blockText(node) {
  let text = '';
  node.forEach((child) => {
    if (child.isText) text += child.text;
  });
  return text;
}

// Document position of character `offset` within the textblock at `blockPos`.
export function posAtTextOffset(node, blockPos, offset) {
  let seen = 0;
  let result = null;
  node.forEach((child, childOffset) => {
    if (result !== null || !child.isText) return;
    const len = child.text.length;
    if (offset <= seen + len) result = blockPos + 1 + childOffset + (offset - seen);
    seen += len;
  });
  return result ?? blockPos + node.nodeSize - 1; // end of the block
}

// Where a citation for `sentence` belongs: right after its last word, before
// the closing punctuation ("…working memory (Frenda & Fenn, 2016).").
export function citationPosForSentence(doc, sentence) {
  const core = sentence.replace(/\s+/g, ' ').trim().replace(/[\s.!?;:,"'”’)\]]+$/u, '');
  if (!core) return null;
  let found = null;
  doc.descendants((node, pos) => {
    if (found !== null) return false;
    if (!node.isTextblock) return true;
    const text = blockText(node).replace(/\s+/g, ' ');
    const i = text.indexOf(core);
    if (i !== -1) found = posAtTextOffset(node, pos, i + core.length);
    return false;
  });
  return found;
}
