# Optimized Data Flow with Next.js App Router

This document outlines a modernized data flow for the application, leveraging the Next.js App Router, Server Components, and Server Actions to create a more performant and maintainable architecture.

## 1. Project Structure with App Router

Migrating from the `pages` directory to the `app` directory enables powerful features like nested layouts and server-first data fetching.

- **`app/`**: The new root for routing.
- **`app/layout.js`**: The root layout for the entire application.
- **`app/past-shows/page.js`**: The main page component for past shows, now a Server Component.
- **`app/components/`**: Reusable components, which can be Server or Client Components.

## 2. Data Fetching with Server Components

With the App Router, we can fetch data directly within our components on the server, simplifying the architecture significantly.

### `app/past-shows/page.js` (Server Component)

This component will be an `async` function that fetches data directly using Prisma.

```javascript
// app/past-shows/page.js
import { prisma } from '../../prisma/globalprisma';
import Search from '../components/Search'; // A client component for search

async function getArtworks() {
  const artworks = await prisma.mytable.findMany();
  return artworks.map(artwork => ({ ...artwork, id: artwork.id.toString() }));
}

export default async function PastShowsPage() {
  const initialArtworks = await getArtworks();

  return (
    <div>
      <h1>Past Shows</h1>
      {/* The Search component will handle its own state and actions */}
      <Search />
      {/* Render initial artworks or other static content */}
    </div>
  );
}

# Interactive Search with Server Actions

// app/actions.js
'use server';

import { prisma } from '../prisma/globalprisma';

export async function searchArtworks(searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    return [];
  }

  const artworks = await prisma.mytable.findMany({
    where: {
      OR: [
        { artist: { contains: searchTerm, mode: 'insensitive' } },
        { medium1: { contains: searchTerm, mode: 'insensitive' } },
        { medium2: { contains: searchTerm, mode: 'insensitive' } },
      ],
    },
  });

  return artworks.map(artwork => ({ ...artwork, id: artwork.id.toString() }));
}

## pt 2

// app/components/Search.js
'use client';

import { useState } from 'react';
import { searchArtworks } from '../actions';

export default function Search() {
  const [results, setResults] = useState([]);
  const [search, setSearch] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    const searchResult = await searchArtworks(search);
    setResults(searchResult);
  };

  return (
    <div>
      <form onSubmit={handleSearch}>
        <input 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by artist or medium..."
        />
        <button type="submit">Search</button>
      </form>
      <ul>
        {results.map((result) => (
          <li key={result.id}>
            <strong>{result.artist}</strong> - {result.medium1}
          </li>
        ))}
      </ul>
    </div>
  );
}

## 4. Optimized Data Flow Diagram

The new data flow is much simpler and more efficient.

```mermaid
graph TD
    subgraph Browser
        A[Client Component: <Search />]
    end

    subgraph "Next.js Server (App Router)"
        B[Server Component: `past-shows/page.js`]
        C[Server Action: `searchArtworks()`]
        D[Prisma Client]
    end

    subgraph Database
        E[CockroachDB: mytable]
    end

    B -- "1. Fetches initial data on page load" --> D
    A -- "2. User search triggers Server Action" --> C
    C -- "3. Action queries database for search results" --> D
    D -- "4. Prisma sends SQL to Database" --> E