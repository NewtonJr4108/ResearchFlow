// Every source (OpenAlex, arXiv, Crossref) is normalized to this one shape:
//
// {
//   key:      stable id used for de-duplication ("doi:…", "arxiv:…", "openalex:…")
//   title, abstract, venue, type, url, pdfUrl, doi, arxivId
//   authors:  [{ given, family }]
//   year:     number | null
//   citedBy:  number | null
//   source:   'openalex' | 'arxiv' | 'crossref'
// }

const NAME_PARTICLES = new Set(['van', 'von', 'der', 'den', 'de', 'del', 'della', 'da', 'di', 'du', 'la', 'le', 'bin', 'al']);
const NAME_SUFFIXES = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv']);

// "Ashish Vaswani" -> { given: 'Ashish', family: 'Vaswani' }
// "Ludwig van Beethoven" -> { given: 'Ludwig', family: 'van Beethoven' }
// "Vaswani, Ashish" -> { given: 'Ashish', family: 'Vaswani' }
export function splitName(name) {
  const clean = String(name || '').replace(/\s+/g, ' ').trim();
  if (!clean) return { given: '', family: '' };
  if (clean.includes(',')) {
    const [family, ...rest] = clean.split(',');
    return { given: rest.join(',').trim(), family: family.trim() };
  }
  const parts = clean.split(' ');
  let suffix = '';
  if (parts.length > 2 && NAME_SUFFIXES.has(parts[parts.length - 1].toLowerCase())) {
    suffix = ' ' + parts.pop();
  }
  if (parts.length === 1) return { given: '', family: parts[0] + suffix };
  let i = parts.length - 1;
  while (i > 1 && NAME_PARTICLES.has(parts[i - 1].toLowerCase())) i--;
  return { given: parts.slice(0, i).join(' '), family: parts.slice(i).join(' ') + suffix };
}

export function cleanDoi(doi) {
  if (!doi) return null;
  return String(doi).replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').trim().toLowerCase() || null;
}

export function paperKey(p) {
  if (p.doi) return `doi:${p.doi}`;
  if (p.arxivId) return `arxiv:${p.arxivId}`;
  return `${p.source}:${p.sourceId || p.title?.toLowerCase().slice(0, 80)}`;
}

export function normalizeTitle(title) {
  return String(title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Merge results from several sources, keeping the first copy of each paper
// but filling in fields (abstract, pdf link, citations) the later copies have.
export function dedupe(papers) {
  const byKey = new Map();
  const byTitle = new Map();
  for (const p of papers) {
    const t = normalizeTitle(p.title);
    const existing = byKey.get(p.key) || (t && byTitle.get(t));
    if (existing) {
      for (const field of ['abstract', 'pdfUrl', 'doi', 'arxivId', 'venue', 'year', 'citedBy']) {
        if (existing[field] == null || existing[field] === '') existing[field] = p[field];
      }
      continue;
    }
    byKey.set(p.key, p);
    if (t) byTitle.set(t, p);
  }
  return [...byKey.values()];
}
