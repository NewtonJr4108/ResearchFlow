// Text utilities for the citation finder: sentence splitting, keyword queries,
// and pulling the reference list out of a paper's extracted text.

const STOPWORDS = new Set(`a about above after again against all also although am among an and any are as at be
because been before being below between both but by can could did do does doing down during each either et al
few for from further had has have having he her here hers him his how however i if in into is it its itself
just may me might more most must my no nor not now of off on once only or other our ours out over own per
rather same she should since so some such than that the their theirs them then there these they this those
through thus to too under until up upon us very via was we were what when where whether which while who whom
whose why will with within without would yet you your yours study studies research paper result results show
shows shown suggest suggests found finding findings evidence significantly significant often many much one two
new use used using based several various important however therefore moreover furthermore`.split(/\s+/));

const ABBREVIATIONS = /\b(e\.g|i\.e|et al|fig|figs|eq|eqs|vs|cf|dr|mr|ms|prof|approx|no|vol|pp|ch|sec)\./gi;

export function splitSentences(text) {
  const protectedText = String(text || '')
    .replace(/\s+/g, ' ')
    .replace(ABBREVIATIONS, (m) => m.replace(/\./g, '\u0000'));
  const parts = protectedText.match(/[^.!?]+(?:[.!?]+["')\]]*|$)/g) || [];
  return parts.map((s) => s.replace(/\u0000/g, '.').trim()).filter(Boolean);
}

export function wordCount(s) {
  return (s.match(/[\p{L}\p{N}]+/gu) || []).length;
}

// Turn a sentence into a compact search query of its content words.
export function keywordQuery(sentence, maxTerms = 10) {
  const seen = new Set();
  const terms = [];
  for (const raw of sentence.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []) {
    const w = raw.toLowerCase().replace(/['’]s$/, '');
    if (w.length < 3 || STOPWORDS.has(w) || /^\d+$/.test(w) || seen.has(w)) continue;
    seen.add(w);
    terms.push(w);
    if (terms.length >= maxTerms) break;
  }
  return terms.join(' ');
}

/* ------------------------------ Reference lists ------------------------------ */

const HEADING_RE = /^[ \t]*(?:\d{1,2}\.?[ \t]*|[IVX]{1,4}\.[ \t]*)?(references|bibliography|works cited|literature cited|reference list|references and notes)[ \t]*:?[ \t]*$/gim;
const END_RE = /^[ \t]*(?:[A-Z]\.?[ \t]+|\d{1,2}\.?[ \t]+)?(appendix|appendices|supplementary (?:material|information)|supplemental material|acknowledg(?:e)?ments?)\b.*$/im;

export function findReferenceSection(text) {
  const src = String(text || '').replace(/\r\n?/g, '\n');
  let last = null;
  for (const m of src.matchAll(HEADING_RE)) last = m;
  if (!last) return '';
  let section = src.slice(last.index + last[0].length);
  const end = section.match(END_RE);
  if (end && end.index > 200) section = section.slice(0, end.index);
  return section;
}

function cleanLines(section) {
  return section
    .replace(/([a-z])-\n([a-z])/g, '$1$2') // re-join words hyphenated across lines
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^\d{1,4}$/.test(l) && !/^-- \d+ of \d+ --$/.test(l)); // page numbers / page markers
}

// Split at markers like "[3]" or "3." only when the numbers run in sequence,
// so stray numbers inside an entry don't create false splits.
function splitNumbered(joined, markerRe) {
  const cuts = [];
  let expected = 1;
  for (const m of joined.matchAll(markerRe)) {
    if (Number(m[1]) === expected) {
      cuts.push({ index: m.index, length: m[0].length });
      expected++;
    }
  }
  if (cuts.length < 3) return null;
  return cuts.map((c, i) => joined.slice(c.index + c.length, i + 1 < cuts.length ? cuts[i + 1].index : undefined));
}

const AUTHOR_START = /^(?:[\p{Lu}][\p{L}'’-]+(?:[ \t][\p{Lu}][\p{L}'’-]+)?,[ \t]*(?:[\p{Lu}]\.|[\p{Lu}][\p{L}]+)|[\p{Lu}]\.[ \t]?(?:[\p{Lu}]\.[ \t]?)*[\p{Lu}][\p{L}'’-]+,|[\p{Lu}][\p{L}'’-]+[ \t][\p{Lu}][\p{L}'’-]+(?:,|[ \t]and[ \t])|[\p{Lu}][\p{L}'’-]+[ \t](?:[\p{Lu}]\.?[ \t]?){1,3}[,.])/u;

function splitAuthorYear(lines) {
  const entries = [];
  let current = '';
  for (const line of lines) {
    const prevComplete = /[.)\]]$|\d$/.test(current) && /\b(19|20)\d{2}\b/.test(current) && current.length > 40;
    if (current && prevComplete && AUTHOR_START.test(line)) {
      entries.push(current);
      current = line;
    } else {
      current = current ? `${current} ${line}` : line;
    }
  }
  if (current) entries.push(current);
  return entries;
}

export function splitReferences(section, max = 80) {
  const lines = cleanLines(section);
  const joined = lines.join('\n');
  const entries =
    splitNumbered(joined, /(?:^|\n|\s)\[(\d{1,3})\]\s*/g) ||
    splitNumbered(joined, /(?:^|\n)(\d{1,3})\.\s+(?=\S)/g) ||
    splitAuthorYear(lines);
  return entries
    .map((e) => e.replace(/\s+/g, ' ').trim())
    .filter((e) => e.length >= 25 && e.length <= 1200 && /[\p{L}]{3}/u.test(e))
    .slice(0, max);
}

export function extractReferences(text, max) {
  return splitReferences(findReferenceSection(text), max);
}

/* ------------------------------- Match scoring ------------------------------- */

function tokens(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9]+/g) || [];
}

// How much of the candidate title appears in the raw reference string (0..1),
// lowered when the years disagree.
export function matchScore(candidate, rawReference) {
  const titleWords = tokens(candidate.title).filter((w) => w.length > 2 && !STOPWORDS.has(w));
  if (titleWords.length === 0) return 0;
  // A title with one or two real words ("About the Title") matches almost anything
  // by overlap alone, so require the whole title to appear as a phrase.
  if (titleWords.length < 3) {
    return ` ${tokens(rawReference).join(' ')} `.includes(` ${tokens(candidate.title).join(' ')} `) ? 0.8 : 0;
  }
  const raw = new Set(tokens(rawReference));
  const hit = titleWords.filter((w) => raw.has(w)).length;
  let score = hit / titleWords.length;
  const years = rawReference.match(/\b(19|20)\d{2}\b/g);
  if (years && candidate.year && !years.some((y) => Math.abs(Number(y) - candidate.year) <= 1)) score *= 0.75;
  return Math.round(score * 100) / 100;
}

export function findDoi(s) {
  const m = s.match(/\b10\.\d{4,9}\/[^\s"<>,;]+/);
  return m ? m[0].replace(/[.)\]]+$/, '').toLowerCase() : null;
}

export function findArxivId(s) {
  const m = s.match(/arxiv(?:\.org\/(?:abs|pdf)\/|[:\s]*(?:preprint[:\s]*)?(?:arxiv:)?)\s*(\d{4}\.\d{4,5})/i);
  return m ? m[1] : null;
}
