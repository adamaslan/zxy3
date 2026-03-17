#!/usr/bin/env node

/**
 * Run Trending Ranks Pipeline
 *
 * Computes and updates trendingRank for all artists across all windows (7d, 30d, 90d)
 *
 * Usage:
 *   node scripts/run-trending-ranks.js
 */

const { PrismaClient } = require('@prisma/client');
const { computeAllTrending } = require('../lib/trending/calculator');

const prisma = new PrismaClient();

async function main() {
  console.log('Running trending rank computation for all windows (7d, 30d, 90d)...');

  try {
    const result = await computeAllTrending(prisma);

    if (result.status === 'success') {
      console.log(`\nCompleted successfully. Total artists updated: ${result.totalUpdated}`);
      for (const [window, data] of Object.entries(result.results)) {
        console.log(`  ${window}: ${data.updated} artists ranked`);
      }
    } else {
      throw new Error(result.error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
