import React, { useState } from 'react';

export default function PdfUploader() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedText, setParsedText] = useState('');

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    const response = await fetch('/api/parse-pdf', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    setParsedText(data.text);
  };

  return (
    <div>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload & Parse</button>

      {parsedText && (
        <div>
          <h3>Parsed PDF Text:</h3>
          <pre>{parsedText}</pre>
        </div>
      )}
    </div>
  );
}
