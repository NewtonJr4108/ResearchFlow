import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function ProjectPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then(res => res.json())
      .then(data => setProject(data))
      .catch(err => console.error('Error fetching project:', err));
  }, [projectId]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('pdf', selectedFile);

    try {
      const res = await fetch(`/api/projects/${projectId}/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (project) {
        setProject({
          ...project,
          pdfs: [...project.pdfs, { filename: data.pdf.filename, originalname: data.pdf.originalname }]
        });
      }
    } catch (err) {
      console.error('Error uploading PDF:', err);
    }
  };

  if (!project) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>{project.title}</h2>
      <p>{project.description}</p>

      <h3>Uploaded PDFs</h3>
      <ul>
        {project.pdfs.map((pdf, idx) => (
          <li key={idx}>
            <a href={`/uploads/${pdf.filename}`} target="_blank" rel="noreferrer">
              {pdf.originalname}
            </a>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: '20px' }}>
        <input type="file" accept="application/pdf" onChange={(e) => setSelectedFile(e.target.files[0])} />
        <button onClick={handleUpload}>Upload PDF</button>
      </div>
    </div>
  );
}
