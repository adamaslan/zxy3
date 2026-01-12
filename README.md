# ZXY Gallery

**Official Open Source Next.js Website with Prisma and CockroachDB**

Visit the live site: [online.zxygallery.com](http://online.zxygallery.com)

## Overview

ZXY Gallery is a modern web platform for discovering, exploring, and analyzing contemporary artwork and artists. Built with Next.js 14, Prisma ORM, and CockroachDB, the site provides:

- **Artwork Discovery:** Browse and search contemporary artworks
- **Artist Profiles:** Explore artist portfolios and metadata
- **Trending Analytics:** Discover rising artists with real-time trending leaderboards
- **Value Predictions:** ML-powered predictions of artwork value over 1, 3, 5, and 10 year horizons
- **Event Calendar:** Upcoming exhibitions and artist events
- **Curated Collections:** Gallery-managed artist and artwork collections

## Modernization Roadmap (2026)

This repository is undergoing a major modernization to improve data onboarding, add market intelligence features, and optimize the tech stack.

**Key Objectives:**
- Reduce artist onboarding time from 2 hours to 15 minutes (87% faster)
- Launch trending artists leaderboard with multi-window analytics (7d, 30d, 90d)
- Implement ML-powered value predictions (±15% accuracy)
- Surface upcoming shows and artist events
- Modernize API layer with server-driven rendering and caching

**Timeline:** 14 weeks (6 phases starting January 2026)

See [plans/zxy-modernization-roadmap.md](./plans/zxy-modernization-roadmap.md) for full roadmap with phases, requirements, and timeline.

## Quick Start

### Prerequisites
- Node.js 18.x LTS
- npm 9.x+
- PostgreSQL/CockroachDB instance
- Git

### Setup

```bash
git clone https://github.com/zxygallery/zxy3.git
cd zxy3
npm install
npm run p-generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

See [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) for detailed development guide.

### Common Commands

```bash
npm run dev              # Start development server
npm run build            # Build production bundle
npm start                # Run production server
npm test                 # Run all tests
npm run test:watch      # Watch mode for tests
npm run lint            # Check code style
npm run p-format        # Format Prisma schema
npx prisma studio      # Open Prisma Studio UI
```

## Documentation

- [DEVELOPMENT.md](./docs/DEVELOPMENT.md) - Setup and development workflow
- [API_V2.md](./docs/API_V2.md) - API v2 endpoint documentation
- [SCHEMA_MIGRATION.md](./docs/SCHEMA_MIGRATION.md) - Database schema migration guide
- [CLAUDE.md](./CLAUDE.md) - Project-specific guidance for Claude Code

## Tech Stack

**Frontend:**
- React 18.2
- Next.js 14.2
- Three.js (for 3D visualizations)

**Backend:**
- Node.js 18
- Prisma 6.10 ORM
- CockroachDB (PostgreSQL-compatible)

**Data & Analytics:**
- Redis (caching)
- Bull (job queues)
- Replicate API (ML predictions)

**DevOps:**
- GitHub Actions (CI/CD)
- Prisma (migrations)
- Auth0 (authentication)

## Testing

```bash
npm run test              # Run all tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests
npm run test:coverage     # Coverage report
npm run cy:open           # Cypress E2E tests
```

## API

### v2 Endpoints (New)

- `GET /api/v2/artworks` - List artworks
- `GET /api/v2/artists/trending` - Trending artists leaderboard
- `GET /api/v2/predictions/{artist_id}` - Value predictions
- `GET /api/v2/events` - Upcoming events

See [docs/API_V2.md](./docs/API_V2.md) for full documentation.

### v1 Endpoints (Legacy)

- `GET /api/artworks` - List all artworks
- `GET /api/search?searchDB=<term>` - Search artworks

## Contributing

We're looking for open source contributors! Here's how to help:

1. **Review the roadmap:** See [plans/zxy-modernization-roadmap.md](./plans/zxy-modernization-roadmap.md)
2. **Pick a task:** Look for [Good First Issues](https://github.com/zxygallery/zxy3/labels/good%20first%20issue) or reach out
3. **Fork and contribute:** Create a branch, make changes, submit a PR
4. **Follow guidelines:** See [DEVELOPMENT.md](./docs/DEVELOPMENT.md) for code style and testing requirements

## Contact & Community

- **Website:** [zxygallery.com](http://zxygallery.com)
- **Online Gallery:** [online.zxygallery.com](http://online.zxygallery.com)
- **Twitter:** [@zxygallery](https://twitter.com/zxygallery)
- **Email:** contact@zxygallery.com

## License

Open source. See LICENSE file for details.

## Acknowledgments

- Built with ❤️ by the ZXY Gallery team
- Open source libraries: Next.js, Prisma, React, Three.js
- Database: CockroachDB
- Special thanks to all contributors and community members
