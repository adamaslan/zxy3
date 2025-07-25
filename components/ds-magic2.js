import { useState } from 'react';

export default function ArtworkSearchTable() {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setSearched(true);
    
    try {
      const response = await fetch('/api/artworks');
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      
      // Filter the data based on search query
      const filteredArtworks = data.filter(artwork => {
        const query = searchQuery.toLowerCase();
        return (
          artwork.artist?.toLowerCase().includes(query) ||
          artwork.medium1?.toLowerCase().includes(query) ||
          artwork.medium2?.toLowerCase().includes(query) ||
          artwork.price_range?.toLowerCase().includes(query) ||
          artwork.id?.toString().toLowerCase().includes(query)
        );
      });
      
      setArtworks(filteredArtworks);
      setLoading(false);
    } catch (error) {
      console.error('Search error:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 >Artwork Search</h2>
        
        <div className="flex gap-2 mb-4">
   <input 
  type="text" 
  value={searchQuery} 
  onChange={(e) => setSearchQuery(e.target.value)} 
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }}
  placeholder="Enter search terms..." 
  className="search-input"
/>
            <button className="funbutton" 
            onClick={handleSearch}
            disabled={loading}
                    >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Searching for artworks...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <p className="text-red-800">Error loading data: {error}</p>
        </div>
      )}

      {searched && !loading && !error && !artworks.length && (
        <div className="text-center py-8 text-gray-600">
          No artworks found for your search.
        </div>
      )}

      {searched && !loading && artworks.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artist</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Primary Medium</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ">Secondary Medium</th>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price Range</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th> */}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {artworks.map((piece) => (
                <tr key={piece.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{piece.artist}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{piece.medium1}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{piece.medium2 || '-'}</td>
                  {/* <td className="px-6 py-4 whitespace-nowrap">{piece.price_range}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{piece.id}</td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}