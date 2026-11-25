// Citation formatting for APA 7, MLA 9, Chicago (author-date), IEEE and BibTeX.
//
// A paper is { title, authors: [{given, family}], year, venue, doi, arxivId, url, type }.
// format() returns segments ([text, italic?]) so the UI can render italics
// while copy-to-clipboard gets plain text.

export const STYLES = [
  { id: 'apa', label: 'APA 7' },
  { id: 'mla', label: 'MLA 9' },
  { id: 'chicago', label: 'Chicago' },
  { id: 'ieee', label: 'IEEE' },
  { id: 'bibtex', label: 'BibTeX' },
];

const initials = (given, { spaced = true } = {}) =>
  String(given || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.split('-').map((p) => `${p[0].toUpperCase()}.`).join('-'))
    .join(spaced ? ' ' : '');

const fullName = (a) => [a.given, a.family].filter(Boolean).join(' ');
const inverted = (a) => (a.given ? `${a.family}, ${a.given}` : a.family);
const endsWithPunct = (s) => /[.?!]$/.test(s);
const withPeriod = (s) => (endsWithPunct(s) ? s : `${s}.`);

function doiUrl(p) {
  if (p.doi) return `https://doi.org/${p.doi}`;
  if (p.arxivId) return `https://doi.org/10.48550/arXiv.${p.arxivId}`;
  return p.url || '';
}

function venueOf(p) {
  if (p.venue) return p.venue;
  return p.arxivId ? 'arXiv' : '';
}

function joinList(items, { last = 'and', serial = true } = {}) {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]}${serial && last === '&' ? ',' : ''} ${last} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, ${last} ${items[items.length - 1]}`;
}

/* --------------------------------- Styles --------------------------------- */

function apa(p) {
  const people = p.authors.map((a) => (a.given ? `${a.family}, ${initials(a.given)}` : a.family));
  let authors;
  if (people.length > 20) authors = `${people.slice(0, 19).join(', ')}, . . . ${people[people.length - 1]}`;
  else authors = joinList(people, { last: '&' });
  const year = p.year ? `(${p.year}).` : '(n.d.).';
  const preprint = p.type === 'preprint' && !p.doi ? ' [Preprint]' : '';
  const title = withPeriod(`${p.title}${preprint}`);
  const out = [];
  out.push([authors ? `${withPeriod(authors)} ${year} ` : `${title} ${year} `]);
  if (authors) out.push([`${title} `]);
  const venue = venueOf(p);
  if (venue) out.push([venue, true], ['. ']);
  const link = doiUrl(p);
  if (link) out.push([link]);
  return out;
}

function mla(p) {
  const a = p.authors;
  let authors = '';
  if (a.length === 1) authors = inverted(a[0]);
  else if (a.length === 2) authors = `${inverted(a[0])}, and ${fullName(a[1])}`;
  else if (a.length > 2) authors = `${inverted(a[0])}, et al`;
  const out = [];
  if (authors) out.push([`${withPeriod(authors)} `]);
  out.push([`“${withPeriod(p.title)}”`]);
  // Container, year and DOI are comma-separated and the whole thing ends in a period.
  const venue = venueOf(p);
  const link = doiUrl(p).replace(/^https?:\/\//, '');
  const tail = [venue && [venue, true], p.year && [String(p.year)], link && [link]].filter(Boolean);
  tail.forEach((seg, i) => out.push([i === 0 ? ' ' : ', '], seg));
  if (tail.length) out.push(['.']);
  return out;
}

function chicago(p) {
  const a = p.authors;
  const list = a.length > 10 ? [...a.slice(0, 7)] : a;
  const names = list.map((x, i) => (i === 0 ? inverted(x) : fullName(x)));
  // The inverted first name already contains a comma, so two names still need one: "Doe, Jane, and John Roe".
  let authors = names.length === 2 && list[0].given ? `${names[0]}, and ${names[1]}` : joinList(names);
  if (a.length > 10) authors += ', et al';
  const out = [];
  if (authors) out.push([`${withPeriod(authors)} `]);
  out.push([`${p.year || 'n.d.'}. `], [`“${withPeriod(p.title)}” `]);
  const venue = venueOf(p);
  if (venue) out.push([venue, true], ['. ']);
  const link = doiUrl(p);
  if (link) out.push([withPeriod(link)]);
  return out;
}

function ieee(p) {
  const a = p.authors;
  const names = a.map((x) => [initials(x.given), x.family].filter(Boolean).join(' '));
  const authors = a.length > 6 ? `${names[0]} et al.` : joinList(names, { serial: false });
  const out = [];
  if (authors) out.push([`${authors}, `]);
  out.push([`“${p.title},” `]);
  const venue = venueOf(p);
  if (venue) out.push([venue, true], [', ']);
  out.push([p.year ? `${p.year}` : 'n.d.']);
  if (p.doi) out.push([`, doi: ${p.doi}.`]);
  else if (p.arxivId) out.push([`, arXiv:${p.arxivId}.`]);
  else out.push(['.']);
  return out;
}

export function bibtexKey(p) {
  const family = (p.authors[0]?.family || 'anon').normalize('NFKD').replace(/[^A-Za-z]/g, '').toLowerCase();
  const word = (p.title.match(/[A-Za-z]{4,}/g) || ['work']).find((w) => !/^(with|from|that|this|towards?|using|into|about)$/i.test(w)) || 'work';
  return `${family}${p.year || ''}${word.toLowerCase()}`;
}

function bibtex(p) {
  const isPreprint = p.type === 'preprint' || (!p.venue && p.arxivId);
  const fields = [
    ['author', p.authors.map((a) => (a.given ? `${a.family}, ${a.given}` : `{${a.family}}`)).join(' and ')],
    ['title', `{${p.title}}`],
    [isPreprint ? 'howpublished' : 'journal', isPreprint ? (p.arxivId ? `arXiv:${p.arxivId}` : p.venue) : p.venue],
    ['year', p.year],
    ['doi', p.doi],
    ['eprint', p.arxivId],
    ['archivePrefix', p.arxivId ? 'arXiv' : ''],
    ['url', p.doi ? '' : p.url],
  ].filter(([, v]) => v);
  const body = fields.map(([k, v]) => `  ${k} = {${v}}`).join(',\n');
  return [[`@${isPreprint ? 'misc' : 'article'}{${bibtexKey(p)},\n${body}\n}`]];
}

const FORMATTERS = { apa, mla, chicago, ieee, bibtex };

function normalize(paper) {
  return {
    ...paper,
    title: String(paper.title || 'Untitled').replace(/\s+/g, ' ').trim(),
    authors: (paper.authors || []).filter((a) => a && (a.family || a.given)),
  };
}

export function format(paper, style = 'apa') {
  return (FORMATTERS[style] || apa)(normalize(paper)).filter(([t]) => t);
}

export function toText(segments) {
  return segments.map(([t]) => t).join('').trim();
}

export function cite(paper, style) {
  return toText(format(paper, style));
}

// Styles that make sense for a written paper (BibTeX is an export format, not a paper style).
export const DOC_STYLES = STYLES.filter((s) => s.id !== 'bibtex');

export function referencesHeading(style) {
  return style === 'mla' ? 'Works Cited' : style === 'chicago' ? 'Bibliography' : 'References';
}

// Order entries the way the style lists them: alphabetical for author-date
// styles, as given (citation order) for IEEE and BibTeX.
export function orderForBibliography(papers, style = 'apa') {
  if (style === 'ieee' || style === 'bibtex') return papers;
  return [...papers].sort((a, b) => cite(a, style).localeCompare(cite(b, style)));
}

// Whole bibliography as text.
export function bibliography(papers, style = 'apa') {
  return orderForBibliography(papers, style)
    .map((p, i) => (style === 'ieee' ? `[${i + 1}] ${cite(p, style)}` : cite(p, style)))
    .join(style === 'bibtex' ? '\n\n' : '\n');
}

// The part of an in-text citation inside the parentheses, e.g. "Vaswani et al., 2017".
function inTextPart(paper, style) {
  const p = normalize(paper);
  const fams = p.authors.map((a) => a.family);
  const shortTitle = `“${p.title.split(/\s+/).slice(0, 4).join(' ')}${p.title.split(/\s+/).length > 4 ? '…' : ''}”`;
  const yr = p.year || 'n.d.';
  const joiner = style === 'apa' ? ' & ' : ' and ';
  const who = fams.length > 2 ? `${fams[0]} et al.` : fams.join(joiner) || shortTitle;
  if (style === 'mla') return who;
  if (style === 'chicago') return `${who} ${yr}`;
  return `${who}, ${yr}`;
}

// Short in-text form, e.g. (Vaswani et al., 2017).
export function inText(paper, style = 'apa') {
  return `(${inTextPart(paper, style)})`;
}

// In-text citation for one or more sources, as placed in a paper:
//   APA "(Frenda & Fenn, 2016; Vaswani et al., 2017)"   IEEE "[1], [3]"
// `numbers` maps a paper to its IEEE number (order of first citation).
export function inTextGroup(papers, style = 'apa', numbers = () => '?') {
  if (papers.length === 0) return style === 'ieee' ? '[?]' : '(missing source)';
  if (style === 'ieee') {
    return papers.map((p) => numbers(p)).sort((a, b) => a - b).map((n) => `[${n}]`).join(', ');
  }
  return `(${papers.map((p) => inTextPart(p, style)).join('; ')})`;
}

// Source ids in the order they're first cited in a TipTap document (JSON).
export function citedIdsInOrder(docJson) {
  const seen = new Set();
  const order = [];
  (function walk(node) {
    if (!node) return;
    if (node.type === 'citation') {
      for (const id of node.attrs?.sourceIds || []) {
        if (!seen.has(id)) {
          seen.add(id);
          order.push(id);
        }
      }
    }
    (node.content || []).forEach(walk);
  })(docJson);
  return order;
}
