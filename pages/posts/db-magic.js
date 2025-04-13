import { useState, useEffect } from 'react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default function ArtworkTable() {
  const [artworks, setArtworks] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const results = await prisma.mytable.findMany({
        select: {
          id: true,
          artist: true,
          medium1: true,
          medium2: true
        }
      });
      setArtworks(results);
    };
    loadData();
  }, []);

  return (
    <div style={{ padding: '1rem', maxWidth: '800px' }}>
      <h2 style={{ marginBottom: '1rem' }}>Artwork Catalog</h2>
      
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <thead>
          <tr style={{ 
            backgroundColor: '#f8f9fa',
            borderBottom: '2px solid #e3e6f0'
          }}>
            <TableHeader>Artist</TableHeader>
            <TableHeader>Primary Medium</TableHeader>
            <TableHeader>Secondary Medium</TableHeader>
            <TableHeader>ID</TableHeader>
          </tr>
        </thead>
        <tbody>
          {artworks.map((piece) => (
            <tr key={piece.id.toString()} style={{
              borderBottom: '1px solid #e3e6f0',
              '&:last-child': { borderBottom: 'none' }
            }}>
              <TableCell>{piece.artist}</TableCell>
              <TableCell>{piece.medium1}</TableCell>
              <TableCell>{piece.medium2 || '-'}</TableCell>
              <TableCell>{piece.id.toString()}</TableCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableHeader({ children }) {
  return (
    <th style={{
      padding: '0.75rem',
      textAlign: 'left',
      fontWeight: '600',
      color: '#4a4e69'
    }}>
      {children}
    </th>
  );
}

function TableCell({ children }) {
  return (
    <td style={{
      padding: '0.75rem',
      color: '#2b2d42',
      lineHeight: '1.6'
    }}>
      {children}
    </td>
  );
}