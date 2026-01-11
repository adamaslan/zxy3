# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**ZXY Gallery** is a Next.js-based website for displaying and searching artwork. It uses:
- **Next.js 14** (Pages Router, with documented migration path to App Router)
- **Prisma ORM** connected to CockroachDB
- **React 18** with Three.js for 3D visualizations
- **Auth0** for authentication
- **Cypress** for E2E testing

The project manages an artwork database with artist information, mediums, and pricing.

---

## Development Commands

### Setup
```bash
npm install                    # Install dependencies
npm run p-generate             # Generate Prisma client
```

### Running
```bash
npm run dev                    # Start development server (http://localhost:3000)
npm start                      # Start production server on $PORT env var
```

### Building & Formatting
```bash
npm run build                  # Build Next.js app and generate Prisma client
npm run p-format               # Format Prisma schema file
```

### Testing
```bash
npm run cy:open                # Open Cypress UI for E2E testing
```

---

## Architecture

### 1. Data Layer

**Database**: CockroachDB connected via Prisma
- Schema: `prisma/schema.prisma` (single model: `mytable`)
- Fields: `artist` (String), `medium1` (String), `medium2` (optional), `price_range` (String), `id` (BigInt primary key)

**Prisma Client Setup**: `prisma/globalprisma.js`
- Singleton pattern to prevent connection exhaustion in development
- Attached to global object in dev environment
- Includes query, error, and warning logs

**Important BigInt Handling**:
- Database uses BigInt for IDs; must convert to string for JSON serialization
- Global patch in `pages/_app.js` adds `.toJSON()` method to BigInt
- All API responses serialize BigInt IDs as strings

### 2. API Routes

Located in `pages/api/`:

**`GET /api/artworks`** (`pages/api/artworks.js`)
- Returns all artworks with: id, artist, medium1, medium2, price_range
- Handles BigInt serialization

**`GET /api/search`** (`pages/api/search.js`)
- Query param: `searchDB` (search term)
- Case-insensitive search across artist, medium1, medium2 fields
- Returns empty array if no search term provided
- Handles BigInt serialization

### 3. Pages Structure (Pages Router)

**Key Pages**:
- `pages/index.js` - Home page
- `pages/posts/pastshows.js` - Artwork gallery with search functionality
  - Uses `getServerSideProps` for initial data fetch
  - Client-side search form that calls `/api/search`
- `pages/posts/login.js` - Auth0 integration

**Components** (`/components`):
- `db-magic.js` - `ArtworkTable`: Renders artwork data in table format
- `Search2.js` - `getAllUsers()`: Database fetch utility for server-side code
- `SplashRandom.js`, `SplashScreen.js` - 3D animated splash screens using Three.js
- `layout.js` - Page layout wrapper with Google Tag Manager
- `splash.js` - Inactive/commented-out splash component

### 4. Data Flow

**Current Architecture (Pages Router)**:
```
Browser (React Components)
    ↓
Next.js API Routes (/api/*)
    ↓
Prisma Client
    ↓
CockroachDB
```

Two main patterns:
1. **Client-side fetching**: Components use `useEffect` + `fetch()` to call API routes
2. **Server-side rendering**: `getServerSideProps` fetches data directly via Prisma

### 5. Migration to App Router (Documented)

The file `next-app-router-dataflow.md` documents an optimized architecture using:
- **Server Components** for data fetching
- **Server Actions** for interactive operations
- **Client Components** for UI interactivity

This modernizes the data flow but is not yet implemented. Reference this when planning future refactors.

---

## Key Patterns & Conventions

### Error Handling
- API routes use try-catch and return appropriate HTTP status codes
- BigInt serialization is handled at the API boundary
- Error responses include descriptive messages

### Data Fetching
- Client-side: Use `fetch()` with query parameters
- Server-side: Import and use Prisma client directly via `globalprisma.js`
- Always serialize BigInt IDs to strings when returning JSON

### Component Organization
- `/components` for React components (layout, tables, 3D visuals)
- `/pages` for route-based components
- `/pages/api` for API handlers
- `/styles` for CSS modules and global styles

---

## Important Notes

1. **Prisma Client**: Always import from `prisma/globalprisma.js`, not directly from `@prisma/client` in the browser.

2. **BigInt Serialization**: Manually convert BigInt to string in API handlers or use the global patch in `_app.js`.

3. **Search Implementation**: Currently case-insensitive substring matching. See `pages/api/search.js` for exact implementation.

4. **Database Credentials**: Check `.env` for DATABASE_URL connection string to CockroachDB.

5. **Three.js Components**: The 3D splash screens use `react-three/fiber` and `drei`. These are heavy libraries—consider lazy loading if performance becomes an issue.

6. **Auth0**: Basic setup in `pages/posts/login.js`. Integration follows Next.js Auth0 SDK patterns.

7. **Testing**: Cypress tests in `/cypress` directory. Use `npm run cy:open` to run interactively.

---

## Documentation Files

- **`dataflow.md`**: Explains current data flow from database to UI components
- **`next-app-router-dataflow.md`**: Proposed migration to App Router with Server Components and Actions
- **`components.md`**: Summary of component purposes and technologies
- **`artwork_search_table.md`**: Details about the artwork search and table display
- **`search_analysis.md`**: Analysis of search functionality
