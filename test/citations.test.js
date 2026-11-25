import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bibliography, citedIdsInOrder, cite, format, inText, inTextGroup, orderForBibliography } from '../src/lib/citations.js';

const frenda = {
  title: 'Sleep less, think worse: The effect of sleep deprivation on working memory',
  authors: [{ given: 'Steven J.', family: 'Frenda' }, { given: 'Kimberly M.', family: 'Fenn' }],
  year: 2016,
  venue: 'Journal of Applied Research in Memory and Cognition',
  doi: '10.1016/j.jarmac.2016.10.001',
  type: 'article',
};

const vaswani = {
  title: 'Attention Is All You Need',
  authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar'].map((n) => ({ given: n.split(' ')[0], family: n.split(' ')[1] })),
  year: 2017,
  venue: '',
  doi: null,
  arxivId: '1706.03762',
  type: 'preprint',
};

test('APA 7', () => {
  assert.equal(cite(frenda, 'apa'),
    'Frenda, S. J., & Fenn, K. M. (2016). Sleep less, think worse: The effect of sleep deprivation on working memory. Journal of Applied Research in Memory and Cognition. https://doi.org/10.1016/j.jarmac.2016.10.001');
  assert.equal(cite(vaswani, 'apa'),
    'Vaswani, A., Shazeer, N., & Parmar, N. (2017). Attention Is All You Need [Preprint]. arXiv. https://doi.org/10.48550/arXiv.1706.03762');
});

test('APA italicizes only the venue', () => {
  const italic = format(frenda, 'apa').filter(([, i]) => i).map(([t]) => t);
  assert.deepEqual(italic, ['Journal of Applied Research in Memory and Cognition']);
});

test('MLA 9', () => {
  assert.equal(cite(frenda, 'mla'),
    'Frenda, Steven J., and Kimberly M. Fenn. “Sleep less, think worse: The effect of sleep deprivation on working memory.” Journal of Applied Research in Memory and Cognition, 2016, doi.org/10.1016/j.jarmac.2016.10.001.');
  assert.equal(cite(vaswani, 'mla'),
    'Vaswani, Ashish, et al. “Attention Is All You Need.” arXiv, 2017, doi.org/10.48550/arXiv.1706.03762.');
  assert.equal(cite({ title: 'Untraceable', authors: [], year: null }, 'mla'), '“Untraceable.”');
});

test('Chicago author-date', () => {
  assert.equal(cite(frenda, 'chicago'),
    'Frenda, Steven J., and Kimberly M. Fenn. 2016. “Sleep less, think worse: The effect of sleep deprivation on working memory.” Journal of Applied Research in Memory and Cognition. https://doi.org/10.1016/j.jarmac.2016.10.001.');
});

test('IEEE', () => {
  assert.equal(cite(frenda, 'ieee'),
    'S. J. Frenda and K. M. Fenn, “Sleep less, think worse: The effect of sleep deprivation on working memory,” Journal of Applied Research in Memory and Cognition, 2016, doi: 10.1016/j.jarmac.2016.10.001.');
});

test('BibTeX', () => {
  assert.equal(cite(vaswani, 'bibtex'), `@misc{vaswani2017attention,
  author = {Vaswani, Ashish and Shazeer, Noam and Parmar, Niki},
  title = {{Attention Is All You Need}},
  howpublished = {arXiv:1706.03762},
  year = {2017},
  eprint = {1706.03762},
  archivePrefix = {arXiv}
}`);
  assert.match(cite(frenda, 'bibtex'), /^@article\{frenda2016sleep,\n/);
});

test('bibliography is alphabetized for APA and numbered for IEEE', () => {
  assert.match(bibliography([vaswani, frenda], 'apa'), /^Frenda[^\n]+\nVaswani/);
  assert.match(bibliography([vaswani, frenda], 'ieee'), /^\[1\] A\. Vaswani et al\.|^\[1\] A\. Vaswani, N\. Shazeer, and N\. Parmar/);
});

test('in-text citations', () => {
  assert.equal(inText(frenda, 'apa'), '(Frenda & Fenn, 2016)');
  assert.equal(inText(vaswani, 'apa'), '(Vaswani et al., 2017)');
  assert.equal(inText(vaswani, 'mla'), '(Vaswani et al.)');
  assert.equal(inText(frenda, 'chicago'), '(Frenda and Fenn 2016)');
});

test('in-text citations for several sources at once', () => {
  const numbers = (p) => (p === vaswani ? 3 : 1);
  assert.equal(inTextGroup([frenda, vaswani], 'apa'), '(Frenda & Fenn, 2016; Vaswani et al., 2017)');
  assert.equal(inTextGroup([frenda, vaswani], 'mla'), '(Frenda and Fenn; Vaswani et al.)');
  assert.equal(inTextGroup([frenda, vaswani], 'chicago'), '(Frenda and Fenn 2016; Vaswani et al. 2017)');
  assert.equal(inTextGroup([vaswani, frenda], 'ieee', numbers), '[1], [3]');
  assert.equal(inTextGroup([], 'apa'), '(missing source)');
});

test('anonymous works fall back to a short title', () => {
  assert.equal(inText({ title: 'A report on the state of sleep research worldwide', authors: [], year: 2020 }, 'apa'),
    '(“A report on the…”, 2020)');
});

test('finds cited source ids in order of first appearance', () => {
  const doc = { type: 'doc', content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'A' }, { type: 'citation', attrs: { sourceIds: ['b', 'a'] } }] },
    { type: 'heading', content: [{ type: 'citation', attrs: { sourceIds: ['a'] } }] },
    { type: 'paragraph', content: [{ type: 'citation', attrs: { sourceIds: ['c', 'b'] } }] },
  ] };
  assert.deepEqual(citedIdsInOrder(doc), ['b', 'a', 'c']);
  assert.deepEqual(citedIdsInOrder({ type: 'doc' }), []);
});

test('bibliography order: alphabetical for APA, citation order for IEEE', () => {
  assert.deepEqual(orderForBibliography([vaswani, frenda], 'apa').map((p) => p.year), [2016, 2017]);
  assert.deepEqual(orderForBibliography([vaswani, frenda], 'ieee').map((p) => p.year), [2017, 2016]);
});
