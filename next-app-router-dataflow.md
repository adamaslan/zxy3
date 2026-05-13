# Optimized Data Flow with Next.js App Router

This document outlines a modernized data flow for the application, leveraging the Next.js App Router, Server Components, and Server Actions to create a more performant and maintainable architecture.

## 1. Project Structure with App Router

Migrating from the `pages` directory to the `app` directory enables powerful features like nested layouts and server-first data fetching.

- **`app/`**: The new root for routing
- **`app/layout.js`**: The root layout for the entire application
- **`app/past-shows/page.js`**: The main page component for past shows, now a Server Component
- **`app/components/`**: Reusable components, which can be Server or Client Components

## 2. Data Fetching with Server Components

With the App Router, we can fetch data directly within our components on the server, simplifying the architecture significantly.

### Server Component Implementation

**File: `app/past-shows/page.js`**

```js
// app/past-shows/page.js
import { prisma } from '../../prisma/globalprisma';
import Search from '../components/Search';

async function getArtworks() {
  const artworks = await prisma.mytable.findMany();
  return artworks.map(artwork => ({ 
    ...artwork, 
    id: artwork.id.toString() 
  }));
}

export default async function PastShowsPage() {
  const initialArtworks = await getArtworks();
  
  return (
    <div>
      <h1>Past Shows</h1>
      <Search />
    </div>
  );
}
```

## 3. Server Actions for Interactive Search

**File: `app/actions.js`**

```js
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
  
  return artworks.map(artwork => ({ 
    ...artwork, 
    id: artwork.id.toString() 
  }));
}
```

## 4. Client Component for Search Interface

**File: `app/components/Search.js`**

```js
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
```

## 5. Data Flow Architecture

```mermaid
graph TD
    subgraph "🌐 Browser"
        A[Client Component: Search]
        A1[User Input]
        A2[Search Results Display]
    end
    
    subgraph "⚡ Next.js Server"
        B[Server Component: PastShowsPage]
        C[Server Action: searchArtworks]
        D[Prisma Client]
    end
    
    subgraph "💾 Database Layer"
        E[CockroachDB: mytable]
    end
    
    A1 --> |"Form Submit"| C
    B --> |"Initial Load"| D
    C --> |"Search Query"| D
    D --> |"SQL Query"| E
    E --> |"Raw Data"| D
    D --> |"Formatted Results"| C
    C --> |"JSON Response"| A2
    B --> |"Server Render"| A
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#f3e5f5
    style D fill:#fff3e0
    style E fill:#e8f5e8
```

## 6. Request Flow Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client Component
    participant S as Server Action
    participant P as Prisma
    participant DB as CockroachDB
    
    Note over U,DB: Initial Page Load
    U->>C: Visits /past-shows
    C->>P: getArtworks()
    P->>DB: SELECT * FROM mytable
    DB-->>P: Initial artwork data
    P-->>C: Formatted artworks
    C-->>U: Rendered page with search form
    
    Note over U,DB: Search Interaction
    U->>C: Types search term + submits
    C->>S: searchArtworks(searchTerm)
    S->>P: findMany() with filters
    P->>DB: SELECT with WHERE conditions
    DB-->>P: Filtered results
    P-->>S: Matched artworks
    S-->>C: JSON response
    C-->>U: Updated search results
```

## 7. Performance Benefits

| Aspect | Traditional SPA | Next.js App Router |
|--------|----------------|-------------------|
| **Initial Load** | Client-side data fetching | Server-rendered with data |
| **Search Response** | Full page JavaScript | Server Action response |
| **Bundle Size** | Large client bundle | Optimized server/client split |
| **SEO** | Limited crawlability | Full server-side rendering |
| **Caching** | Browser-only | Server + CDN + Browser |

## 8. Implementation Checklist

- [ ] Migrate from `pages/` to `app/` directory structure
- [ ] Convert page components to async Server Components
- [ ] Extract data fetching logic into Server Actions
- [ ] Mark interactive components with `'use client'`
- [ ] Update import paths for new directory structure
- [ ] Test server actions with form submissions
- [ ] Verify Prisma client works in server context
- [ ] Implement error boundaries for client components