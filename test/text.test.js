import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractReferences, findArxivId, findDoi, keywordQuery, matchScore, splitSentences,
} from '../server/lib/text.js';
import { splitName, dedupe } from '../server/lib/paper.js';

test('splits bracket-numbered reference lists, ignoring stray numbers', () => {
  const text = `Intro text citing [1] and [2].
Conclusion.
References
[1] A. Vaswani, N. Shazeer, N. Parmar, et al. Attention is all you
need. In Advances in Neural Information Processing Systems 30, pages
5998–6008, 2017.
[2] K. He, X. Zhang, S. Ren, and J. Sun. Deep residual learning for image recog-
nition. In CVPR [7], 2016.
[3] J. Devlin, M. Chang, K. Lee, and K. Toutanova. BERT: Pre-training of deep
bidirectional transformers for language understanding. arXiv:1810.04805, 2018.
Appendix A
Extra material that is long enough to not be part of the reference list at all, honestly it goes on for a while here and here and here and here and more more more more more more more more.`;
  const refs = extractReferences(text);
  assert.equal(refs.length, 3);
  assert.match(refs[0], /^A\. Vaswani.*Attention is all you need\..*2017\.$/);
  assert.match(refs[1], /image recognition/); // hyphenated line break re-joined
  assert.match(refs[1], /CVPR \[7\]/); // out-of-sequence [7] did not split the entry
  assert.ok(!refs.some((r) => /Appendix|Extra material/.test(r)));
});

test('splits dot-numbered reference lists', () => {
  const text = `Bibliography
1. Smith J, Doe A. Sleep and memory consolidation in adolescents. J Sleep Res. 2019;28(3):e12744.
2. Lee K. Working memory capacity under sleep restriction. Sleep. 2005;28(1):55-67.
3. Brown R, et al. Screen time and anxiety. Pediatrics. 2020;145(2):1-9.`;
  const refs = extractReferences(text);
  assert.equal(refs.length, 3);
  assert.match(refs[1], /^Lee K\. Working memory/);
});

test('splits author-year (APA-style) reference lists', () => {
  const text = `REFERENCES
Frenda, S. J., & Fenn, K. M. (2016). Sleep less, think worse: The effect of sleep
deprivation on working memory. Journal of Applied Research in Memory and
Cognition, 5(4), 463–469. https://doi.org/10.1016/j.jarmac.2016.10.001.
Gerhardsson, A., Åkerstedt, T., Axelsson, J., Fischer, H., Lekander, M., &
Schwarz, J. (2019). Effect of sleep deprivation on emotional working memory.
Journal of Sleep Research, 28(1), e12744.
Mu, Q., Nahas, Z., Johnson, K. A., et al. (2005). Decreased cortical response to verbal working memory following sleep deprivation. Sleep, 28(1), 55–67.`;
  const refs = extractReferences(text);
  assert.equal(refs.length, 3);
  assert.match(refs[0], /^Frenda.*10\.1016\/j\.jarmac\.2016\.10\.001\.$/);
  assert.match(refs[1], /^Gerhardsson.*Schwarz, J\. \(2019\)/); // wrapped author list stays in one entry
  assert.equal(findDoi(refs[0]), '10.1016/j.jarmac.2016.10.001');
});

test('returns nothing when there is no reference heading', () => {
  assert.deepEqual(extractReferences('Just a body of text with no bibliography.'), []);
});

test('finds arXiv ids in several spellings', () => {
  assert.equal(findArxivId('arXiv preprint arXiv:1810.04805, 2018.'), '1810.04805');
  assert.equal(findArxivId('https://arxiv.org/abs/1706.03762v5'), '1706.03762');
  assert.equal(findArxivId('No identifiers here'), null);
});

test('scores candidate matches by title overlap and year', () => {
  const raw = 'Frenda, S. J., & Fenn, K. M. (2016). Sleep less, think worse: The effect of sleep deprivation on working memory.';
  assert.equal(matchScore({ title: 'Sleep less, think worse: The effect of sleep deprivation on working memory', year: 2016 }, raw), 1);
  assert.ok(matchScore({ title: 'Sleep less, think worse: The effect of sleep deprivation on working memory', year: 2009 }, raw) < 0.8);
  assert.ok(matchScore({ title: 'Quantum chromodynamics on the lattice', year: 2016 }, raw) < 0.2);
});

test('does not let very short titles match by a single shared word', () => {
  const raw = 'Q. Nobody. A completely made up paper title about purple quantum giraffes. Imaginary Journal, 2031.';
  assert.equal(matchScore({ title: 'ABOUT THE TITLE', year: null }, raw), 0);
  assert.equal(matchScore({ title: 'Purple Giraffes', year: 2031 }, 'X. Y. Purple giraffes. 2031.'), 0.8);
});

test('splits sentences without breaking on common abbreviations', () => {
  const s = splitSentences('Prior work (e.g. Smith et al. 2019) shows X. Fig. 2 confirms it! Does Y hold?');
  assert.deepEqual(s, ['Prior work (e.g. Smith et al. 2019) shows X.', 'Fig. 2 confirms it!', 'Does Y hold?']);
});

test('builds keyword queries from content words', () => {
  assert.equal(keywordQuery('The effects of chronic sleep deprivation on the working memory of adolescents.'),
    'effects chronic sleep deprivation working memory adolescents');
});

test('splits author names into given and family parts', () => {
  assert.deepEqual(splitName('Ashish Vaswani'), { given: 'Ashish', family: 'Vaswani' });
  assert.deepEqual(splitName('Ludwig van Beethoven'), { given: 'Ludwig', family: 'van Beethoven' });
  assert.deepEqual(splitName('Vaswani, Ashish'), { given: 'Ashish', family: 'Vaswani' });
  assert.deepEqual(splitName('Martin Luther King Jr.'), { given: 'Martin Luther', family: 'King Jr.' });
  assert.deepEqual(splitName('Plato'), { given: '', family: 'Plato' });
});

test('dedupes the same paper from two sources and merges fields', () => {
  const merged = dedupe([
    { key: 'doi:10.1/x', title: 'Attention Is All You Need', doi: '10.1/x', abstract: '', citedBy: 100 },
    { key: 'arxiv:1706.03762', title: 'Attention is all you need', arxivId: '1706.03762', abstract: 'We propose…' },
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].abstract, 'We propose…');
  assert.equal(merged[0].arxivId, '1706.03762');
});
