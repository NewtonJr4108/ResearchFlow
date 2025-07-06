import express from 'express';
import pdfParserRoutes from './routes/pdfParser.js';
import projectRoutes from './routes/projects.js';
const app = express();

app.use('/api', pdfParserRoutes);
app.use('/api/projects', projectRoutes);
app.use('/uploads', express.static('uploads')); // Serve static files


app.listen(5000, () => {
  console.log('Server running on port 5000');
});
