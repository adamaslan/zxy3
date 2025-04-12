// pages/artworks.tsx
import { useState, useEffect } from 'react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getServerSideProps() {
  try {
    const initialArtworks = await prisma.mytable.findMany();
    return { props: { initialArtworks } };
  } catch (error) {
    console.error('Database error:', error);
    return { props: { initialArtworks: [] } };
  } finally {
    await prisma.$disconnect();
  }
}

export default function ArtworksPage({ initialArtworks }) {
  const [artworks, setArtworks] = useState(initialArtworks);
  const [filters, setFilters] = useState({
    searchTerm: '',
    priceRange: '',
    medium: '',
    sortBy: 'artist',
  });

  // Feature 1: Unified filtering/sorting logic
  useEffect(() => {
    const filtered = initialArtworks.filter(artwork => {
      const matchesSearch = [artwork.artist, artwork.medium1, artwork.medium2]
        .some(field => field.toLowerCase().includes(filters.searchTerm.toLowerCase()));
      
      const matchesPrice = !filters.priceRange || 
        artwork.price_range === filters.priceRange;
      
      const matchesMedium = !filters.medium || 
        [artwork.medium1, artwork.medium2].includes(filters.medium);

      return matchesSearch && matchesPrice && matchesMedium;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (filters.sortBy === 'price') {
        const priceOrder = { Low: 1, Medium: 2, High: 3 };
        return priceOrder[a.price_range] - priceOrder[b.price_range];
      }
      return a.artist.localeCompare(b.artist);
    });

    setArtworks(sorted);
  }, [filters, initialArtworks]);

  // Feature 2: Dynamic price options
  const priceOptions = [...new Set(initialArtworks.map(a => a.price_range))];

  // Feature 3: Medium tag cloud
  const allMediums = [...new Set(initialArtworks.flatMap(a => [a.medium1, a.medium2]))]
    .filter(Boolean)
    .sort();

  // Feature 4: Export to CSV
  const exportCSV = () => {
    const csvContent = [
      ['Artist', 'Primary Medium', 'Secondary Medium', 'Price Range'],
      ...artworks.map(a => [a.artist, a.medium1, a.medium2, a.price_range])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'artworks.csv';
    a.click();
  };

  return (
    <div className="container mx-auto p-4">
      {/* Feature 5: Search/filter header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <input
          placeholder="Search artists/mediums"
          className="p-2 border"
          value={filters.searchTerm}
          onChange={e => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
        />
        
        <select
          className="p-2 border"
          value={filters.priceRange}
          onChange={e => setFilters(prev => ({ ...prev, priceRange: e.target.value }))}
        >
          <option value="">All Prices</option>
          {priceOptions.map(price => (
            <option key={price} value={price}>{price}</option>
          ))}
        </select>

        <select
          className="p-2 border"
          value={filters.medium}
          onChange={e => setFilters(prev => ({ ...prev, medium: e.target.value }))}
        >
          <option value="">All Mediums</option>
          {allMediums.map(medium => (
            <option key={medium} value={medium}>{medium}</option>
          ))}
        </select>

        <select
          className="p-2 border"
          value={filters.sortBy}
          onChange={e => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
        >
          <option value="artist">Sort by Artist</option>
          <option value="price">Sort by Price</option>
        </select>
      </div>

      {/* Feature 6: Stats overview */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-gray-100 rounded">
          <h3 className="font-bold">Total Artworks</h3>
          <p className="text-2xl">{artworks.length}</p>
        </div>
        <div className="p-4 bg-gray-100 rounded">
          <h3 className="font-bold">Unique Mediums</h3>
          <p className="text-2xl">{allMediums.length}</p>
        </div>
        <div className="p-4 bg-gray-100 rounded">
          <h3 className="font-bold">Artists</h3>
          <p className="text-2xl">{[...new Set(artworks.map(a => a.artist))].length}</p>
        </div>
      </div>

      {/* Feature 7: Artwork grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {artworks.map(artwork => (
          <div key={artwork.id} className="border p-4 rounded-lg hover:shadow-lg">
            <h3 className="font-bold text-lg mb-2">{artwork.artist}</h3>
            <div className="flex gap-2 mb-2">
              <span className="bg-blue-100 px-2 py-1 rounded text-sm">
                {artwork.medium1}
              </span>
              {artwork.medium2 && (
                <span className="bg-green-100 px-2 py-1 rounded text-sm">
                  {artwork.medium2}
                </span>
              )}
            </div>
            <div className={`badge ${artwork.price_range.toLowerCase()}`}>
              {artwork.price_range}
            </div>
          </div>
        ))}
      </div>

      {/* Feature 8: Export button */}
      <div className="text-center">
        <button 
          onClick={exportCSV}
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
        >
          Export to CSV
        </button>
      </div>

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
          display: inline-block;
        }
        .low { background-color: #dcfce7; color: #166534; }
        .medium { background-color: #fef9c3; color: #854d0e; }
        .high { background-color: #fee2e2; color: #991b1b; }
      `}</style>
    </div>
  );
}