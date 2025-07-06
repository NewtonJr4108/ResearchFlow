
export async function arxivSearch(searchTerm) {
  try {
    const response = await fetch(`/api/arxiv?search=${encodeURIComponent(searchTerm)}`);
    const text = await response.text();

    // Parse XML as before...
    console.log(text);
    return text;
  } catch (error) {
    console.error("Error fetching arXiv data:", error);
    return null;
  }
}

