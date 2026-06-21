# Development Guide

**Version:** 2.0 (Modernization roadmap)
**Last Updated:** 2026-01-11

## Quick Start

### Prerequisites

- Node.js 18.x LTS
- npm 9.x+
- PostgreSQL/CockroachDB instance (or use existing connection)
- Git

### Setup

```bash
# Clone repository (if not done)
git clone https://github.com/zxygallery/zxy3.git
cd zxy3

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database URL and API keys

# Generate Prisma client
npm run p-generate

# Start development server
npm run dev
# Open http://localhost:3000
```

## Project Structure

```
zxy3/
├── lib/                      # Shared library code
│   ├── api/                  # API utilities and handlers
│   ├── analytics/            # Trending and analytics logic
│   ├── importers/            # Gallery source adapters
│   ├── predictions/          # ML prediction service
│   ├── redis/                # Redis caching client
│   ├── middleware/           # Validation, auth middleware
│   ├── jobs/                 # Background jobs (cron)
│   ├── events/               # Event aggregation
│   └── logger/               # Logging utilities
├── pages/                    # Next.js pages and API routes
│   ├── api/
│   │   ├── v1/               # Legacy API (v1)
│   │   └── v2/               # New API (v2)
│   └── posts/                # Public pages
├── components/               # React components
├── prisma/                   # Prisma schema and migrations
├── tests/                    # Test suites
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── e2e/                  # End-to-end tests (Cypress)
├── docs/                     # Documentation
├── plans/                    # Project plans and roadmaps
└── ../artist-db/cockroach-db/scripts/
                                # Data import, enrichment, and export scripts

```

## Common Development Tasks

### Running Tests

```bash
# Run all tests
npm run test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Watch mode (re-run on file change)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Working with Database

```bash
# Sync schema with database
npm run p-generate

# Create a new migration
prisma migrate dev --name <migration_name>

# Format Prisma schema
npm run p-format

# View database interactively
prisma studio

# Run migration (production)
prisma migrate deploy
```

### API Development

#### Creating a New API Endpoint

1. Create file: `/pages/api/v2/[resource].js`

```javascript
import { prisma } from '../../../prisma/globalprisma';
import { validateQuery } from '../../../lib/middleware/validation';
import { cacheResponse, getCached } from '../../../lib/redis/cache';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check cache
  const cacheKey = `resource:${JSON.stringify(req.query)}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return res.setHeader('X-Cache', 'HIT').json(cached);
  }

  // Validate query parameters
  const validation = validateQuery(req.query, {
    limit: { type: 'number', max: 100 },
    offset: { type: 'number', min: 0 }
  });
  if (!validation.ok) {
    return res.status(400).json({ error: validation.errors });
  }

  try {
    // Fetch data
    const data = await prisma.resource.findMany({
      take: req.query.limit || 20,
      skip: req.query.offset || 0
    });

    // Cache response
    await cacheResponse(cacheKey, data, 3600); // 1h TTL

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json({
      status: 'success',
      data,
      meta: { cached: false, cache_ttl: 3600 }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

2. Test the endpoint:
```bash
curl http://localhost:3000/api/v2/resource?limit=10
```

### Server-Side Rendering (Pages)

#### Converting Client-Side to Server-Driven

Before (client-side):
```javascript
// pages/posts/artworks.js
import { useEffect, useState } from 'react';

export default function ArtworksPage() {
  const [artworks, setArtworks] = useState([]);

  useEffect(() => {
    fetch('/api/artworks').then(r => r.json()).then(setArtworks);
  }, []);

  return <div>{artworks.map(a => <div key={a.id}>{a.artist}</div>)}</div>;
}
```

After (server-driven with ISR):
```javascript
// pages/posts/artworks.js
import { prisma } from '../../prisma/globalprisma';

export default function ArtworksPage({ artworks }) {
  return <div>{artworks.map(a => <div key={a.id}>{a.artist}</div>)}</div>;
}

export async function getServerSideProps() {
  const artworks = await prisma.artworks.findMany({
    include: { artist: { select: { name: true } } },
    take: 50
  });

  return {
    props: { artworks },
    revalidate: 3600 // ISR: re-generate every hour
  };
}
```

### Debugging

#### Enable Debug Logging

```javascript
// Set env variable
process.env.DEBUG = 'prisma:*,api:*';

// Or in .env
DEBUG=prisma:*,api:*
```

#### Use Prisma Studio

```bash
npx prisma studio
# Opens browser UI to inspect/edit database
```

#### Check Prisma Query Logs

```javascript
// In prisma/globalprisma.js
prisma.$on('query', (e) => {
  console.log('Query: ' + e.query)
  console.log('Params: ' + JSON.stringify(e.params))
  console.log('Duration: ' + e.duration + 'ms')
})
```

## Environment Variables

Create `.env` file in project root:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/zxy"

# Redis
REDIS_URL="redis://localhost:6379"

# API Keys
REPLICATE_API_TOKEN="your_token_here"
SAATCHI_API_KEY="your_key_here"
ARTSY_API_KEY="your_key_here"

# Auth0
AUTH0_SECRET="your_secret"
AUTH0_BASE_URL="http://localhost:3000"
AUTH0_ISSUER_BASE_URL="https://your-domain.auth0.com"
AUTH0_CLIENT_ID="your_client_id"
AUTH0_CLIENT_SECRET="your_client_secret"

# Monitoring
SENTRY_DSN="https://key@sentry.io/project"
LOG_LEVEL="debug"  # debug, info, warn, error
```

## Linting & Code Style

```bash
# Lint code
npm run lint

# Fix linting errors
npm run lint -- --fix
```

Configuration: See `.eslintrc` (inherited from Next.js default).

## Performance Testing

### Load Testing with k6

```bash
# Install k6: https://k6.io/docs/getting-started/installation/

# Run load test
k6 run tests/load/api_load_test.js
```

### Measuring Query Performance

```bash
# Enable query logging
export DEBUG=prisma:*

npm run dev

# Make requests and check console for query duration
```

## Deployment

### Staging

```bash
# Build locally
npm run build

# Deploy to staging environment
git push origin develop
# GitHub Actions will run CI/CD pipeline
```

### Production

```bash
# Tag release
git tag -a v0.2.0 -m "Phase P00-P01 complete"
git push origin v0.2.0

# Deploy to production
git push origin main
# GitHub Actions will run production deployment
```

## Getting Help

- **Documentation:** See `/docs` folder
- **Issues:** Report bugs via GitHub Issues
- **Team:** Ask in Slack #development channel
- **Roadmap:** See `/plans/zxy-modernization-roadmap.md`

## Useful Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (http://localhost:3000) |
| `npm run build` | Build production bundle |
| `npm run start` | Run production server |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run p-generate` | Generate Prisma client |
| `npm run p-format` | Format Prisma schema |
| `npx prisma studio` | Open Prisma Studio UI |
| `npm run lint` | Check code style |
| `npm run cy:open` | Open Cypress E2E test runner |

## Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and test: `npm test`
3. Commit: `git commit -am "Add my feature"`
4. Push: `git push origin feature/my-feature`
5. Open Pull Request with description
6. Wait for CI to pass and code review
7. Merge to develop

See CLAUDE.md for additional project-specific guidance.
