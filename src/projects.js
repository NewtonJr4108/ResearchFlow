import express from 'express';
import multer from 'multer';
import Project from '../models/Project.js';

const router = express.Router();

// Set up multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // ensure this folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Upload PDF to project
router.post('/:projectId/upload', upload.single('pdf'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    project.pdfs.push({
      filename: req.file.filename,
      originalname: req.file.originalname
    });

    await project.save();

    res.json({ message: 'PDF uploaded successfully', pdf: req.file });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error uploading PDF' });
  }
});

export default router;
