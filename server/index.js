import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import researchRoutes from './routes/research.js';

// API_PORT, not PORT: dev tools and hosts often set PORT for the web server.
const PORT = Number(process.env.API_PORT) || 5050;
const app = express();

// In development Vite proxies /api, so this only matters if the client is served elsewhere.
app.use(cors({ origin: [/^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/] }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api', researchRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: `No API route for ${req.method} ${req.path}` }));

// In production (`npm run build && npm start`) the same server serves the built client.
const dist = fileURLToPath(new URL('../dist', import.meta.url));
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile('index.html', { root: dist }));
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'That PDF is larger than 25 MB.' : err.message });
  }
  console.error(err);
  res.status(err.status && err.status < 600 ? 502 : 500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, () => console.log(`ResearchFlow API listening on http://localhost:${PORT}`));
