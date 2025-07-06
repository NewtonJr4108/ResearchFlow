import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import fs from 'fs';

const router = express.Router();

// Multer setup for uploads folder
const upload = multer({ dest: 'uploads/' });

// POST route to handle PDF upload and parse
router.post('/parse-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const dataBuffer = fs.readFileSync(req.file.path);
    const data = await pdfParse(dataBuffer);

    // Optionally delete uploaded file after parsing to save storage
    fs.unlinkSync(req.file.path);

    res.json({ text: data.text });
  } catch (error) {
    console.error('PDF parsing error:', error);
    res.status(500).json({ error: 'Failed to parse PDF' });
  }
});

export default router;
