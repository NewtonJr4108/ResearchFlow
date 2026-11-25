import { forwardRef } from 'react';
import { format, orderForBibliography, referencesHeading } from '../../lib/citations.js';

// Page styles, shared by the in-app preview and the downloaded HTML file.
export const PAPER_CSS = `
.paper-page { background: #fff; color: #111; max-width: 8.5in; margin: 0 auto; padding: 1in;
  font-family: 'Times New Roman', Times, 'Iowan Old Style', Georgia, serif; font-size: 12pt; line-height: 2;
  box-shadow: 0 2px 14px rgba(0,0,0,0.12); }
.paper-page .pp-title { text-align: center; font-weight: 700; font-size: 12pt; margin: 0 0 0.2in; line-height: 2; font-family: inherit; color: #111; }
.paper-page .pp-byline { text-align: center; white-space: pre-line; margin-bottom: 0.3in; }
.paper-page h1, .paper-page h2, .paper-page h3 { font-family: inherit; font-size: 12pt; color: #111; line-height: 2; margin: 0.15in 0 0; }
.paper-page h1 { text-align: center; font-weight: 700; }
.paper-page h2 { font-weight: 700; }
.paper-page h3 { font-weight: 700; font-style: italic; }
.paper-page p { margin: 0; text-indent: 0.5in; }
.paper-page blockquote { margin: 0 0 0 0.5in; padding: 0; border: 0; }
.paper-page blockquote p { text-indent: 0; }
.paper-page ul, .paper-page ol { margin: 0; padding-left: 0.5in; }
.paper-page li p { text-indent: 0; }
.paper-page a { color: inherit; }
.paper-page .pp-refs { break-before: page; page-break-before: always; padding-top: 0.2in; }
.paper-page .pp-refs h2 { text-align: center; }
.paper-page .pp-ref { padding-left: 0.5in; text-indent: -0.5in; overflow-wrap: anywhere; }
.paper-page .pp-ref.numbered { display: grid; grid-template-columns: 0.5in 1fr; padding-left: 0; text-indent: 0; }
.paper-page .pp-empty { color: #777; font-style: italic; text-align: center; }
@media print { .paper-page { box-shadow: none; padding: 0; max-width: none; } }
@page { margin: 1in; }
`;

// `html` comes from the editor's own serializer (schema-checked, no scripts).
const PaperPreview = forwardRef(function PaperPreview({ title, byline, html, citedSources, style }, ref) {
  const entries = orderForBibliography(citedSources, style);
  return (
    <article className="paper-page" ref={ref}>
      {title && <h1 className="pp-title">{title}</h1>}
      {byline && <div className="pp-byline">{byline}</div>}
      <div className="pp-body" dangerouslySetInnerHTML={{ __html: html }} />
      <section className="pp-refs">
        <h2>{referencesHeading(style)}</h2>
        {entries.length === 0 && <p className="pp-empty">Citations you add to the paper will be listed here.</p>}
        {entries.map((paper, i) => (
          <div key={paper.id} className={`pp-ref ${style === 'ieee' ? 'numbered' : ''}`}>
            {style === 'ieee' && <span>[{i + 1}]</span>}
            <span>{format(paper, style).map(([text, italic], j) => (italic ? <i key={j}>{text}</i> : <span key={j}>{text}</span>))}</span>
          </div>
        ))}
      </section>
    </article>
  );
});

export default PaperPreview;

export function standaloneHtml(title, pageHtml) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title || 'Paper')}</title>
<style>body { margin: 0; padding: 0.5in 0; background: #eee; } ${PAPER_CSS}</style>
</head><body>${pageHtml}</body></html>`;
}
