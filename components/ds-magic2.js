import { useState } from 'react';

export default function ArtworkSearchTable() {
  const [artists, setArtists] = useState([]);
  const [legacy, setLegacy] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setArtists(data.results?.artists || []);
      setLegacy(data.results?.legacy || []);
      setLoading(false);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const hasResults = artists.length > 0 || legacy.length > 0;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2>Artwork Search</h2>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="Enter search terms..."
            className="search-input"
          />
          <button className="funbutton" onClick={handleSearch} disabled={loading}>
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

      {searched && !loading && !error && !hasResults && (
        <div className="text-center py-8 text-gray-600">
          No artworks found for your search.
        </div>
      )}

      {/* V2 artists results */}
      {searched && !loading && artists.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artist</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Primary Medium</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Secondary Medium</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {artists.map((artist) =>
                artist.artworks.length > 0
                  ? artist.artworks.map((aw) => (
                      <tr key={aw.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">{artist.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{aw.medium || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{aw.medium_secondary || '-'}</td>
                      </tr>
                    ))
                  : (
                    <tr key={artist.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{artist.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">-</td>
                      <td className="px-6 py-4 whitespace-nowrap">-</td>
                    </tr>
                  )
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Legacy mytable fallback results */}
      {searched && !loading && legacy.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artist</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Primary Medium</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Secondary Medium</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {legacy.map((piece) => (
                <tr key={piece.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{piece.artist}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{piece.medium1}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{piece.medium2 || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
