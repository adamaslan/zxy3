#!/usr/bin/env node

/**
 * Phase P01: Data Migration Script
 * Migrate artworks from mytable (v1) to artworks + artists (v2)
 *
 * Usage:
 *   node scripts/migrate_artworks_v1_to_v2.js --dry-run
 *   node scripts/migrate_artworks_v1_to_v2.js
 *
 * Environment:
 *   DATABASE_URL - Connection string (read .env)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Parse CLI arguments
const isDryRun = process.argv.includes('--dry-run');
const logMismatches = process.argv.includes('--log-mismatches');

async function main() {
  console.log(`🔄 Starting migration (dry-run: ${isDryRun ? 'YES' : 'NO'})...`);
  console.log('');

  try {
    // ====================================================================
    // PHASE 1: Analyze current state
    // ====================================================================
    console.log('📊 Phase 1: Analyzing current state...');

    const totalRows = await prisma.mytable.count();
    console.log(`  ✓ Total rows in mytable: ${totalRows}`);

    if (totalRows === 0) {
      console.log('  ⚠️  No data in mytable. Skipping migration.');
      return;
    }

    // Get unique artists (case-insensitive)
    const allArtists = await prisma.mytable.findMany({
      select: { artist: true },
      distinct: ['artist']
    });

    const uniqueArtistCount = allArtists.length;
    console.log(`  ✓ Unique artists: ${uniqueArtistCount}`);
    console.log('');

    // ====================================================================
    // PHASE 2: Create artists with deduplication
    // ====================================================================
    console.log('👥 Phase 2: Creating artists (deduplicating)...');

    const artistMap = {}; // Map old artist name -> new artist ID
    let createdCount = 0;
    let skippedCount = 0;
    const mismatches = [];

    for (const { artist } of allArtists) {
      if (!artist || artist.trim() === '') {
        console.log(`  ⚠️  Skipping empty artist name`);
        skippedCount++;
        continue;
      }

      const normalizedName = artist.trim();

      if (!isDryRun) {
        // Check if artist already exists (case-insensitive)
        const existing = await prisma.artist.findFirst({
          where: {
            name: {
              equals: normalizedName,
              mode: 'insensitive'
            }
          }
        });

        if (existing) {
          artistMap[artist] = existing.id;
          skippedCount++;
        } else {
          const created = await prisma.artist.create({
            data: {
              name: normalizedName,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          artistMap[artist] = created.id;
          createdCount++;
          console.log(`  ✓ Created artist: "${normalizedName}" (ID: ${created.id})`);
        }
      } else {
        // Dry-run: just count
        artistMap[artist] = Math.floor(Math.random() * 1000000); // Fake ID for counting
        createdCount++;
      }
    }

    console.log(`  ✓ Created: ${createdCount}, Skipped (duplicates): ${skippedCount}`);
    console.log('');

    // ====================================================================
    // PHASE 3: Migrate artworks
    // ====================================================================
    console.log('🎨 Phase 3: Migrating artworks...');

    const allArtworks = await prisma.mytable.findMany();
    let artworksMigrated = 0;
    let artworkErrors = 0;

    for (const row of allArtworks) {
      try {
        const artistId = artistMap[row.artist];

        if (!artistId) {
          console.log(`  ❌ Artist not found for: "${row.artist}"`);
          artworkErrors++;
          if (logMismatches) {
            mismatches.push({
              artworkId: row.id,
              artist: row.artist,
              issue: 'Artist ID not found in map'
            });
          }
          continue;
        }

        if (!isDryRun) {
          await prisma.artwork.create({
            data: {
              artistId,
              medium1: row.medium1 || 'Unknown',
              medium2: row.medium2 || null,
              priceRange: row.price_range || null,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }

        artworksMigrated++;
      } catch (error) {
        console.log(`  ❌ Error migrating artwork ID ${row.id}: ${error.message}`);
        artworkErrors++;
        if (logMismatches) {
          mismatches.push({
            artworkId: row.id,
            artist: row.artist,
            issue: error.message
          });
        }
      }
    }

    console.log(`  ✓ Migrated: ${artworksMigrated}, Errors: ${artworkErrors}`);
    console.log('');

    // ====================================================================
    // PHASE 4: Validation
    // ====================================================================
    console.log('✅ Phase 4: Validating migration...');

    if (!isDryRun) {
      const artworkCount = await prisma.artwork.count();
      const artistCount = await prisma.artist.count();
      const artistsWithArtworks = await prisma.artwork.groupBy({
        by: ['artistId'],
        _count: true
      });

      console.log(`  ✓ Artists created: ${artistCount}`);
      console.log(`  ✓ Artworks migrated: ${artworkCount}`);
      console.log(`  ✓ Expected artworks: ${totalRows}`);

      if (artworkCount === totalRows) {
        console.log(`  ✅ Row counts match perfectly!`);
      } else {
        console.log(`  ⚠️  Row count mismatch: ${artworkCount} vs ${totalRows}`);
      }

      // Check for orphaned artists
      const orphanedArtists = await prisma.artist.findMany({
        where: {
          artworks: {
            none: {}
          }
        }
      });

      if (orphanedArtists.length > 0) {
        console.log(`  ⚠️  Found ${orphanedArtists.length} artists with no artworks`);
      } else {
        console.log(`  ✓ No orphaned artists`);
      }

      // Check for NULL artist IDs
      const nullArtistIds = await prisma.artwork.count({
        where: {
          artistId: null
        }
      });

      if (nullArtistIds === 0) {
        console.log(`  ✓ No NULL artist IDs`);
      } else {
        console.log(`  ❌ Found ${nullArtistIds} artworks with NULL artist ID`);
      }
    } else {
      console.log(`  ℹ️  (Dry-run: validation skipped)`);
    }

    console.log('');

    // ====================================================================
    // PHASE 5: Summary
    // ====================================================================
    console.log('📋 Migration Summary');
    console.log('═'.repeat(50));
    console.log(`  Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`  Source table: mytable (${totalRows} rows)`);
    console.log(`  Artists created: ${createdCount} (${skippedCount} duplicates)`);
    console.log(`  Artworks migrated: ${artworksMigrated} (${artworkErrors} errors)`);

    if (mismatches.length > 0) {
      console.log(`  Issues found: ${mismatches.length}`);
      if (logMismatches) {
        console.log('');
        console.log('  Mismatches:');
        mismatches.forEach(m => {
          console.log(`    - Artwork ${m.artworkId}: ${m.issue}`);
        });
      }
    }

    if (isDryRun) {
      console.log('');
      console.log('  ℹ️  This was a DRY RUN. No changes made to database.');
      console.log('  Run without --dry-run to execute the migration.');
    } else {
      console.log('');
      console.log('  ✅ Migration complete!');
    }

    console.log('═'.repeat(50));

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
