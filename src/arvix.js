import express from 'express';
import Parser from 'rss-parser';

const router = express.Router();
const parser = new Parser({
  customFields: {
    item: ['summary'], // arXiv uses <summary> not <content>
  },
});

router.get('/arxiv', async (req, res) => {
  const { search } = req.query;

  if (!search) {
    return res.status(400).json({ error: 'Missing search query' });
  }

  const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(search)}&start=0&max_results=5`;

  try {
    const feed = await parser.parseURL(url);

    // Transform feed items into your desired JSON structure
    const results = feed.items.map((item) => ({
      id: item.link,
      title: item.title,
      summary: item.summary || '',
    }));

    res.json(results);
  } catch (error) {
    console.error('Error fetching arXiv data:', error);
    res.status(500).json({ error: 'Server error fetching arXiv data' });
  }
});

export default router;
