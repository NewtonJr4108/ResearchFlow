// Clients for the three scholarly APIs. Each returns normalized papers (see paper.js).
import { XMLParser } from 'fast-xml-parser';
import { getJson, getText } from './http.js';
import { cleanDoi, paperKey, splitName } from './paper.js';

const OPENALEX_KEY = process.env.OPENALEX_API_KEY || '';
const CROSSREF_MAILTO = process.env.CROSSREF_MAILTO || '';

function finish(p) {
  p.key = paperKey(p);
  return p;
}

const ARXIV_ID_RE = /arxiv\.org\/(?:abs|pdf)\/([a-z\-.]*\/?\d{4}\.?\d{3,5})(v\d+)?/i;

/* ---------------------------------- OpenAlex ---------------------------------- */

const OPENALEX_FIELDS = [
  'id', 'title', 'doi', 'publication_year', 'authorships', 'primary_location',
  'cited_by_count', 'abstract_inverted_index', 'open_access', 'type',
].join(',');

function rebuildAbstract(index) {
  if (!index) return '';
  const words = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const pos of positions) words[pos] = word;
  }
  return words.filter(Boolean).join(' ');
}

function fromOpenAlex(w) {
  const oaUrl = w.open_access?.oa_url || w.primary_location?.pdf_url || null;
  const arxivMatch = oaUrl && oaUrl.match(ARXIV_ID_RE);
  return finish({
    source: 'openalex',
    sourceId: w.id?.replace('https://openalex.org/', ''),
    title: w.title || '(untitled)',
    authors: (w.authorships || []).map((a) => splitName(a.author?.display_name)),
    year: w.publication_year || null,
    venue: w.primary_location?.source?.display_name || '',
    doi: cleanDoi(w.doi),
    arxivId: arxivMatch ? arxivMatch[1] : null,
    url: w.doi || w.primary_location?.landing_page_url || w.id,
    pdfUrl: oaUrl,
    abstract: rebuildAbstract(w.abstract_inverted_index),
    citedBy: w.cited_by_count ?? null,
    type: w.type || 'article',
  });
}

export async function searchOpenAlex(query, { limit = 10, fromYear, sort } = {}) {
  const params = new URLSearchParams({ search: query, 'per-page': String(limit), select: OPENALEX_FIELDS });
  if (fromYear) params.set('filter', `from_publication_date:${fromYear}-01-01`);
  if (sort === 'citations') params.set('sort', 'cited_by_count:desc');
  if (sort === 'recent') params.set('sort', 'publication_date:desc');
  if (OPENALEX_KEY) params.set('api_key', OPENALEX_KEY);
  const data = await getJson(`https://api.openalex.org/works?${params}`);
  return (data.results || []).map(fromOpenAlex);
}

/* ------------------------------------ arXiv ----------------------------------- */

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
const asArray = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const squash = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

function fromArxiv(entry) {
  const absUrl = squash(entry.id);
  const idMatch = absUrl.match(ARXIV_ID_RE);
  const pdfLink = asArray(entry.link).find((l) => l.title === 'pdf');
  return finish({
    source: 'arxiv',
    sourceId: idMatch ? idMatch[1] : absUrl,
    title: squash(entry.title),
    authors: asArray(entry.author).map((a) => splitName(squash(a.name))),
    year: entry.published ? Number(String(entry.published).slice(0, 4)) : null,
    venue: squash(entry['arxiv:journal_ref']) || 'arXiv',
    doi: cleanDoi(squash(entry['arxiv:doi'])),
    arxivId: idMatch ? idMatch[1] : null,
    url: absUrl.replace(/v\d+$/, ''),
    pdfUrl: pdfLink?.href || null,
    abstract: squash(entry.summary),
    citedBy: null,
    type: 'preprint',
  });
}

async function arxivQuery(params) {
  const text = await getText(`https://export.arxiv.org/api/query?${params}`);
  const feed = xml.parse(text).feed || {};
  return asArray(feed.entry).filter((e) => e.title).map(fromArxiv);
}

export function searchArxiv(query, { limit = 10 } = {}) {
  const terms = query.replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/).filter(Boolean).slice(0, 8);
  if (!terms.length) return [];
  const search = terms.map((t) => `all:${t}`).join(' AND ');
  return arxivQuery(new URLSearchParams({ search_query: search, start: '0', max_results: String(limit), sortBy: 'relevance' }));
}

export async function lookupArxivIds(ids) {
  if (!ids.length) return [];
  return arxivQuery(new URLSearchParams({ id_list: ids.join(','), max_results: String(ids.length) }));
}

/* ----------------------------------- Crossref --------------------------------- */

function fromCrossref(item) {
  const year = item.issued?.['date-parts']?.[0]?.[0] || item.published?.['date-parts']?.[0]?.[0] || null;
  const doi = cleanDoi(item.DOI);
  return finish({
    source: 'crossref',
    sourceId: doi,
    title: squash(asArray(item.title)[0]) || '(untitled)',
    authors: asArray(item.author).map((a) => (a.family ? { given: a.given || '', family: a.family } : splitName(a.name))),
    year,
    venue: squash(asArray(item['container-title'])[0]),
    doi,
    arxivId: null,
    url: doi ? `https://doi.org/${doi}` : item.URL,
    pdfUrl: asArray(item.link).find((l) => l['content-type'] === 'application/pdf')?.URL || null,
    abstract: squash(String(item.abstract || '').replace(/<[^>]+>/g, ' ')),
    citedBy: item['is-referenced-by-count'] ?? null,
    type: item.type || 'article',
    score: item.score,
  });
}

function crossrefParams(extra) {
  const params = new URLSearchParams(extra);
  if (CROSSREF_MAILTO) params.set('mailto', CROSSREF_MAILTO);
  return params;
}

export async function lookupDoi(doi) {
  const data = await getJson(`https://api.crossref.org/works/${encodeURIComponent(doi)}?${crossrefParams({})}`);
  return data.message ? fromCrossref(data.message) : null;
}

export async function matchCitation(text) {
  const params = crossrefParams({ 'query.bibliographic': text.slice(0, 500), rows: '3' });
  const data = await getJson(`https://api.crossref.org/works?${params}`);
  return (data.message?.items || []).map(fromCrossref);
}
