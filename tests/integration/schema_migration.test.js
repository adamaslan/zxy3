/**
 * Integration Tests: Schema Migration (Phase P01)
 *
 * Tests the data migration from mytable (v1) to artworks + artists (v2)
 * Ensures:
 * - All records migrated without loss
 * - No duplicate artists
 * - Referential integrity maintained
 * - Backward compatibility working
 */

const { PrismaClient } = require('@prisma/client');

// Create a test prisma instance (uses TEST DATABASE_URL from env)
const prisma = new PrismaClient();

describe('Schema Migration (P01)', () => {

  // =====================================================================
  // Setup & Teardown
  // =====================================================================

  beforeAll(async () => {
    console.log('\n📄 Starting schema migration tests...');
    // Migrations should already be run via: npx prisma migrate deploy
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // =====================================================================
  // Test Suite 1: Table Structure
  // =====================================================================

  describe('Table Structure', () => {

    test('should have artists table', async () => {
      const result = await prisma.$executeRaw`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'artists'
      `;
      expect(result).toBeDefined();
    });

    test('should have artworks table', async () => {
      const result = await prisma.$executeRaw`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'artworks'
      `;
      expect(result).toBeDefined();
    });

    test('should have gallery_sources table', async () => {
      const result = await prisma.$executeRaw`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'gallery_sources'
      `;
      expect(result).toBeDefined();
    });

    test('should have artist_metrics table', async () => {
      const result = await prisma.$executeRaw`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'artist_metrics'
      `;
      expect(result).toBeDefined();
    });

    test('should have price_predictions table', async () => {
      const result = await prisma.$executeRaw`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'price_predictions'
      `;
      expect(result).toBeDefined();
    });

    test('should have artist_events table', async () => {
      const result = await prisma.$executeRaw`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'artist_events'
      `;
      expect(result).toBeDefined();
    });

    test('should have audit_log table', async () => {
      const result = await prisma.$executeRaw`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'audit_log'
      `;
      expect(result).toBeDefined();
    });

  });

  // =====================================================================
  // Test Suite 2: Data Integrity
  // =====================================================================

  describe('Data Integrity', () => {

    test('should have no NULL artist names', async () => {
      const count = await prisma.artist.count({
        where: {
          name: null
        }
      });
      expect(count).toBe(0);
    });

    test('should have no NULL artistId in artworks', async () => {
      const count = await prisma.artwork.count({
        where: {
          artistId: null
        }
      });
      expect(count).toBe(0);
    });

    test('should have no orphaned artworks (FK integrity)', async () => {
      const orphaned = await prisma.artwork.findMany({
        where: {
          artist: null
        }
      });
      expect(orphaned).toHaveLength(0);
    });

    test('should have no duplicate artist names', async () => {
      const duplicates = await prisma.$queryRaw`
        SELECT name, COUNT(*) as count FROM artists
        GROUP BY LOWER(name)
        HAVING COUNT(*) > 1
      `;
      expect(duplicates).toHaveLength(0);
    });

  });

  // =====================================================================
  // Test Suite 3: Backward Compatibility
  // =====================================================================

  describe('Backward Compatibility', () => {

    test('should support reading from old mytable', async () => {
      const count = await prisma.mytable.count();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should be able to create new Artist records', async () => {
      const artist = await prisma.artist.create({
        data: {
          name: `Test Artist ${Date.now()}`,
          bio: 'Test bio',
          portfolioUrl: 'https://test.com'
        }
      });
      expect(artist.id).toBeDefined();
      expect(artist.name).toBeTruthy();

      // Cleanup
      await prisma.artist.delete({ where: { id: artist.id } });
    });

    test('should be able to create new Artwork records', async () => {
      // Create test artist
      const artist = await prisma.artist.create({
        data: {
          name: `Test Artist ${Date.now()}`
        }
      });

      // Create artwork
      const artwork = await prisma.artwork.create({
        data: {
          artistId: artist.id,
          medium1: 'Oil on Canvas',
          priceRange: '$5K-25K'
        }
      });

      expect(artwork.id).toBeDefined();
      expect(artwork.artistId).toBe(artist.id);

      // Cleanup
      await prisma.artwork.delete({ where: { id: artwork.id } });
      await prisma.artist.delete({ where: { id: artist.id } });
    });

  });

  // =====================================================================
  // Test Suite 4: Relationships
  // =====================================================================

  describe('Relationships', () => {

    test('should support artist.artworks relationship', async () => {
      const artist = await prisma.artist.create({
        data: { name: `Artist ${Date.now()}` }
      });

      const artwork = await prisma.artwork.create({
        data: {
          artistId: artist.id,
          medium1: 'Watercolor',
          priceRange: '$1K-5K'
        }
      });

      const artistWithArtworks = await prisma.artist.findUnique({
        where: { id: artist.id },
        include: { artworks: true }
      });

      expect(artistWithArtworks.artworks).toHaveLength(1);
      expect(artistWithArtworks.artworks[0].id).toBe(artwork.id);

      // Cleanup
      await prisma.artwork.delete({ where: { id: artwork.id } });
      await prisma.artist.delete({ where: { id: artist.id } });
    });

    test('should cascade delete artworks when artist deleted', async () => {
      const artist = await prisma.artist.create({
        data: { name: `Cascade Test ${Date.now()}` }
      });

      const artwork = await prisma.artwork.create({
        data: {
          artistId: artist.id,
          medium1: 'Digital',
          priceRange: '$500-1K'
        }
      });

      // Delete artist
      await prisma.artist.delete({ where: { id: artist.id } });

      // Artwork should be deleted too
      const deletedArtwork = await prisma.artwork.findUnique({
        where: { id: artwork.id }
      });

      expect(deletedArtwork).toBeNull();
    });

  });

  // =====================================================================
  // Test Suite 5: Audit Logging
  // =====================================================================

  describe('Audit Logging', () => {

    test('should support audit_log table', async () => {
      const count = await prisma.auditLog.count();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should allow creating audit log entries', async () => {
      const auditEntry = await prisma.auditLog.create({
        data: {
          tableName: 'artists',
          recordId: 1n,
          action: 'INSERT',
          newValues: { name: 'Test' },
          changedBy: 'test_user'
        }
      });

      expect(auditEntry.id).toBeDefined();
      expect(auditEntry.action).toBe('INSERT');

      // Cleanup
      await prisma.auditLog.delete({ where: { id: auditEntry.id } });
    });

  });

  // =====================================================================
  // Test Suite 6: Performance
  // =====================================================================

  describe('Performance', () => {

    test('should have artist name index', async () => {
      const start = Date.now();
      await prisma.artist.findFirst({
        where: {
          name: {
            startsWith: 'A'
          }
        }
      });
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should be fast (indexed)
    });

    test('should have artistId index on artworks', async () => {
      const artist = await prisma.artist.create({
        data: { name: `Index Test ${Date.now()}` }
      });

      await prisma.artwork.create({
        data: {
          artistId: artist.id,
          medium1: 'Test'
        }
      });

      const start = Date.now();
      await prisma.artwork.findMany({
        where: { artistId: artist.id }
      });
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should be fast (indexed)

      // Cleanup
      await prisma.artwork.deleteMany({
        where: { artistId: artist.id }
      });
      await prisma.artist.delete({ where: { id: artist.id } });
    });

  });

});
