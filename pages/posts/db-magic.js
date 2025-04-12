// pages/artworks.tsx
import { useState, useEffect } from 'react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getServerSideProps() {
  const initialArtworks = await prisma.mytable.findMany({
    take: 20,
  });
  return { props: { initialArtworks } };
}

export default function ArtworksPage({ initialArtworks }) {
  const [artworks, setArtworks] = useState(initialArtworks);
  const [filters, setFilters] = useState({
    searchTerm: '',
    priceRange: '',
    medium: '',
    sortBy: 'artist',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Feature 1: Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchArtworks();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [filters, currentPage]);

  // Feature 2: Advanced filtering
  const fetchArtworks = async () => {
    const response = await fetch(`/api/artworks?page=${currentPage}&${new URLSearchParams(filters)}`);
    const { data, total } = await response.json();
    setArtworks(data);
    setTotalPages(Math.ceil(total / 20));
  };

  // Feature 3: Price distribution chart
  const priceDistribution = artworks.reduce((acc, { price_range }) => {
    acc[price_range] = (acc[price_range] || 0) + 1;
    return acc;
  }, {});

  // Feature 4: Medium tag cloud
  const allMediums = [...new Set(artworks.flatMap(a => [a.medium1, a.medium2]))].filter(Boolean);

  return (
    <div className="container mx-auto p-4">
      {/* Feature 5: Interactive search/filter panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <input
          placeholder="Search artists/mediums"
          className="p-2 border"
          value={filters.searchTerm}
          onChange={e => setFilters({ ...filters, searchTerm: e.target.value })}
        />
        <select
          className="p-2 border"
          value={filters.priceRange}
          onChange={e => setFilters({ ...filters, priceRange: e.target.value })}
        >
          <option value="">All Prices</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
        <select
          className="p-2 border"
          value={filters.medium}
          onChange={e => setFilters({ ...filters, medium: e.target.value })}
        >
          <option value="">All Mediums</option>
          {allMediums.map(medium => (
            <option key={medium} value={medium}>{medium}</option>
          ))}
        </select>
        <select
          className="p-2 border"
          value={filters.sortBy}
          onChange={e => setFilters({ ...filters, sortBy: e.target.value })}
        >
          <option value="artist">Sort by Artist</option>
          <option value="price">Sort by Price</option>
        </select>
      </div>

      {/* Feature 6: Data visualization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="p-4 bg-white shadow">
          <h3 className="text-xl mb-4">Price Distribution</h3>
          <div className="flex gap-2">
            {Object.entries(priceDistribution).map(([range, count]) => (
              <div key={range} className="bg-blue-100 p-2">
                {range}: {count}
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 bg-white shadow">
          <h3 className="text-xl mb-4">Medium Cloud</h3>
          <div className="flex flex-wrap gap-2">
            {allMediums.map(medium => (
              <button
                key={medium}
                onClick={() => setFilters({ ...filters, medium })}
                className="bg-gray-100 px-3 py-1 rounded-full hover:bg-blue-100"
              >
                {medium}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feature 7: Responsive grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {artworks.map(artwork => (
          <div key={artwork.id} className="border p-4 hover:shadow-lg transition-shadow">
            <h3 className="font-bold text-lg">{artwork.artist}</h3>
            <p className="text-gray-600">{artwork.medium1} + {artwork.medium2}</p>
            <div className={`badge ${artwork.price_range.toLowerCase()}`}>
              {artwork.price_range}
            </div>
            {/* Feature 8: Social share buttons */}
            <div className="mt-2 flex gap-2">
              <button className="text-blue-500">Share</button>
              <button className="text-green-500">Save</button>
            </div>
          </div>
        ))}
      </div>

      {/* Feature 9: Pagination */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i+1}
            onClick={() => setCurrentPage(i+1)}
            className={`px-3 py-1 ${currentPage === i+1 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            {i+1}
          </button>
        ))}
      </div>

      {/* Feature 10: CSV Export */}
      <div className="mt-8 text-center">
        <button 
          className="bg-green-500 text-white px-4 py-2 rounded"
          onClick={() => window.location.href = '/api/export'}
        >
          Export to CSV
        </button>
      </div>
    </div>
  );
}