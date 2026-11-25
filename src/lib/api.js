// Client for the ResearchFlow API server (proxied at /api by Vite in development).

async function call(path, init) {
  let res;
  try {
    res = await fetch(`/api${path}`, init);
  } catch {
    throw new Error('Could not reach the ResearchFlow server. Is `npm run dev` running?');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (!body && (res.status === 502 || res.status === 504)) {
      throw new Error('The research server is not running. Start everything with `npm run dev`.');
    }
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}

export function searchPapers({ q, source = 'all', sort = 'relevance', fromYear, limit = 12 }) {
  const params = new URLSearchParams({ q, source, sort, limit: String(limit) });
  if (fromYear) params.set('fromYear', String(fromYear));
  return call(`/search?${params}`);
}

export function suggestSources(text) {
  return call('/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}

export function extractPdfReferences(file) {
  const form = new FormData();
  form.append('file', file);
  return call('/references', { method: 'POST', body: form });
}
