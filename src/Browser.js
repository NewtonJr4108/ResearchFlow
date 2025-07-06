import React, { useState } from 'react';

export default function Browser() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/arxiv?search=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch');
      }

      const data = await response.json();

      // Ensure data is an array before setting results
      if (Array.isArray(data)) {
        setSearchResults(data);
      } else {
        console.error('Unexpected data format:', data);
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Error fetching arXiv data:', err);
      setError('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>arXiv AI-Assisted Search</h2>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Enter search term"
        style={{ width: '300px', marginRight: '10px' }}
      />
      <button onClick={handleSearch}>Search</button>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div>
        {searchResults.length === 0 && !loading && <p>No results to display</p>}
        {searchResults.map((entry) => (
          <div key={entry.id} style={{ marginTop: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
            <h3>{entry.title}</h3>
            <p>{entry.summary}</p>
            <a href={entry.id} target="_blank" rel="noopener noreferrer">
              View Paper
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
