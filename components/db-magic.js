// components/ArtworkTable.js
import { useState, useEffect } from 'react';

export default function ArtworkTable() {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Use SWR or React Query in a production app for better caching
    let isMounted = true; // For avoiding state updates after unmount
    
    const fetchData = async () => {
      try {
        const response = await fetch('/api/artworks');
        
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        if (isMounted) {
          setArtworks(data);
          setLoading(false);
        }
      } catch (error) {
        console.error('Fetch error:', error);
        if (isMounted) {
          setError(error.message);
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false; // Cleanup to prevent state updates after unmount
    };
  }, []);

  if (loading) return <div>Loading artworks...</div>;
  if (error) return <div>Error loading data: {error}</div>;
  if (!artworks.length) return <div>No artworks found</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Artwork Catalog</h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artist</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Primary Medium</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Secondary Medium</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price Range</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {artworks.map((piece) => (
              <tr key={piece.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">{piece.artist}</td>
                <td className="px-6 py-4 whitespace-nowrap">{piece.medium1}</td>
                <td className="px-6 py-4 whitespace-nowrap">{piece.medium2 || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{piece.price_range}</td>
                <td className="px-6 py-4 whitespace-nowrap">{piece.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}