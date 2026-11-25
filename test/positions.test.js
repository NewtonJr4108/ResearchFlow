import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Schema } from '@tiptap/pm/model';
import { blockText, citationPosForSentence } from '../src/editor/positions.js';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    heading: { group: 'block', content: 'inline*' },
    text: { group: 'inline' },
    citation: { group: 'inline', inline: true, atom: true, attrs: { sourceIds: { default: [] } } },
  },
  marks: { bold: {} },
});

const t = (s, marks) => schema.text(s, marks);
const bold = schema.marks.bold.create();

const doc = schema.node('doc', null, [
  schema.node('heading', null, [t('Introduction')]),
  schema.node('paragraph', null, [
    t('Teens sleep less. '),
    t('Chronic sleep loss', [bold]),
    t(' impairs working memory.'),
    schema.nodes.citation.create({ sourceIds: ['x'] }),
    t(' More text here.'),
  ]),
]);

// Text immediately before/after a position, ignoring atoms.
const around = (pos) => [doc.textBetween(Math.max(pos - 6, 0), pos, '', ''), doc.textBetween(pos, Math.min(pos + 1, doc.content.size), '', '')];

test('blockText skips citation atoms', () => {
  assert.equal(blockText(doc.child(1)), 'Teens sleep less. Chronic sleep loss impairs working memory. More text here.');
});

test('places a citation before the sentence-ending period, across mark boundaries', () => {
  const pos = citationPosForSentence(doc, 'Chronic sleep loss impairs working memory.');
  assert.deepEqual(around(pos), ['memory', '.']);
});

test('finds sentences that come after an existing citation', () => {
  const pos = citationPosForSentence(doc, 'More text here.');
  assert.deepEqual(around(pos), ['t here', '.']);
});

test('tolerates differences in spacing from the server', () => {
  const pos = citationPosForSentence(doc, '  Teens   sleep less. ');
  assert.deepEqual(around(pos), ['p less', '.']);
});

test('returns null when the sentence is no longer in the document', () => {
  assert.equal(citationPosForSentence(doc, 'This sentence was deleted.'), null);
});
