import express from 'express';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import { mapLimit } from '../lib/http.js';
import { dedupe } from '../lib/paper.js';
import { lookupArxivIds, lookupDoi, matchCitation, searchArxiv, searchOpenAlex } from '../lib/sources.js';
import { extractReferences, findArxivId, findDoi, keywordQuery, matchScore, splitSentences, wordCount } from '../lib/text.js';

const router = express.Router();

const MAX_PDF_BYTES = 25 * 1024 * 1024;
const MAX_SENTENCES = 8;
const MATCH_THRESHOLD = 0.7;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_BYTES, files: 1 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname)),
});

// Run several source lookups; one failing source shouldn't sink the others.
async function settle(tasks) {
  const results = await Promise.allSettled(tasks);
  const papers = [];
  const errors = [];
  for (const r of results) {
    if (r.status === 'fulfilled') papers.push(...r.value);
    else errors.push(r.reason?.message || String(r.reason));
  }
  return { papers, errors };
}

/* GET /api/search?q=…&source=all|openalex|arxiv&limit=10&sort=relevance|citations|recent&fromYear=2015 */
router.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'Enter something to search for.' });
    const source = String(req.query.source || 'all');
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 25);
    const fromYear = /^\d{4}$/.test(req.query.fromYear) ? req.query.fromYear : undefined;
    const sort = ['citations', 'recent'].includes(req.query.sort) ? req.query.sort : undefined;

    const tasks = [];
    if (source === 'all' || source === 'openalex') tasks.push(searchOpenAlex(q, { limit, fromYear, sort }));
    if (source === 'all' || source === 'arxiv') tasks.push(searchArxiv(q, { limit: source === 'all' ? Math.ceil(limit / 2) : limit }));
    const { papers, errors } = await settle(tasks);
    if (!papers.length && errors.length) return res.status(502).json({ error: `Search sources failed: ${errors.join('; ')}` });

    let results = dedupe(papers);
    if (fromYear) results = results.filter((p) => !p.year || p.year >= Number(fromYear));
    res.json({ results, warnings: errors });
  } catch (err) {
    next(err);
  }
});

/* POST /api/suggest { text } -> sources that could support each sentence */
router.post('/suggest', express.json({ limit: '200kb' }), async (req, res, next) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (wordCount(text) < 6) return res.status(400).json({ error: 'Paste at least one full sentence of your writing.' });

    const all = splitSentences(text);
    const claims = all.filter((s) => wordCount(s) >= 7);
    const picked = claims.slice(0, MAX_SENTENCES);

    const sentences = await mapLimit(picked, 3, async (sentence) => {
      const query = keywordQuery(sentence);
      try {
        const results = query ? await searchOpenAlex(query, { limit: 4 }) : [];
        return { sentence, query, results };
      } catch (err) {
        return { sentence, query, results: [], error: err.message };
      }
    });
    res.json({ sentences, skipped: claims.length - picked.length });
  } catch (err) {
    next(err);
  }
});

/* POST /api/references (multipart "file") -> the PDF's reference list, resolved to real papers */
router.post('/references', upload.single('file'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'Upload a PDF file (max 25 MB).' });
  let parser;
  try {
    parser = new PDFParse({ data: new Uint8Array(req.file.buffer) });
    // Sequential on purpose: pdf-parse hands the bytes to a worker on first load,
    // so concurrent calls on one parser fail with "Cannot transfer object".
    const textResult = await parser.getText();
    const info = await parser.getInfo().catch(() => null);
    const text = textResult.text || '';
    if (text.trim().length < 200) {
      return res.status(422).json({ error: 'Could not read text from this PDF. It may be a scanned image without a text layer.' });
    }

    const raws = extractReferences(text);
    const arxivIds = [...new Set(raws.map(findArxivId).filter(Boolean))];
    const arxivPapers = await lookupArxivIds(arxivIds).catch(() => []);
    const byArxiv = new Map(arxivPapers.map((p) => [p.arxivId, p]));

    const references = await mapLimit(raws, 3, async (raw) => {
      try {
        const doi = findDoi(raw);
        if (doi) {
          const paper = await lookupDoi(doi).catch(() => null);
          if (paper) return { raw, paper, confidence: 1, via: 'doi' };
        }
        const arxivId = findArxivId(raw);
        if (arxivId && byArxiv.has(arxivId)) return { raw, paper: byArxiv.get(arxivId), confidence: 1, via: 'arxiv' };

        const candidates = await matchCitation(raw);
        const scored = candidates.map((paper) => ({ paper, confidence: matchScore(paper, raw) }))
          .sort((a, b) => b.confidence - a.confidence);
        const best = scored[0];
        if (best && best.confidence >= MATCH_THRESHOLD) return { raw, paper: best.paper, confidence: best.confidence, via: 'search' };
        return { raw, paper: null, confidence: best?.confidence || 0 };
      } catch (err) {
        return { raw, paper: null, confidence: 0, error: err.message };
      }
    });

    res.json({
      fileName: req.file.originalname,
      title: info?.info?.Title || null,
      pages: textResult.total ?? info?.total ?? null,
      references,
      matched: references.filter((r) => r.paper).length,
    });
  } catch (err) {
    if (['InvalidPDFException', 'FormatError'].includes(err?.name)) {
      return res.status(422).json({ error: 'That file is not a readable PDF.' });
    }
    if (err?.name === 'PasswordException') {
      return res.status(422).json({ error: 'That PDF is password-protected. Remove the password and try again.' });
    }
    next(err);
  } finally {
    await parser?.destroy().catch(() => {});
  }
});

export default router;
