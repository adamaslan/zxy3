/**
 * Zod Validation Schemas
 *
 * Defines request/response schemas for API v2 endpoints
 * Provides type safety and automatic validation
 */

const z = require('zod');

/**
 * Common pagination query parameters
 */
const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional()
});

/**
 * GET /api/v2/artworks
 * Query parameters with optional filtering
 */
const getArtworksSchema = paginationSchema.extend({
  artistId: z.coerce.number().optional(),
  search: z.string().max(100).optional(),
  orderBy: z.enum(['createdAt', 'updatedAt']).default('createdAt').optional()
});

/**
 * GET /api/v2/artworks/:id
 * Single artwork by ID
 */
const getArtworkByIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be numeric')
});

/**
 * GET /api/v2/artists
 * List all artists with pagination
 */
const getArtistsSchema = paginationSchema.extend({
  search: z.string().max(100).optional(),
  orderBy: z.enum(['name', 'createdAt']).default('name').optional(),
  careerStage: z.enum(['emerging artist', 'mid-career artist', 'established artist', 'late-career artist']).optional()
});

/**
 * GET /api/v2/artists/:id
 * Single artist by ID
 */
const getArtistByIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be numeric')
});

/**
 * GET /api/v2/search
 * Full-text search across artworks and artists
 */
const searchSchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
  type: z.enum(['artworks', 'artists', 'all']).default('all').optional()
});

/**
 * GET /api/v2/trending/artists
 * Trending artists by time window
 */
const getTrendingArtistsSchema = z.object({
  window: z.enum(['7d', '30d', '90d']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

/**
 * Artwork response schema (for validation of what we return)
 */
const artworkResponseSchema = z.object({
  id: z.string(),
  artistId: z.string(),
  medium1: z.string(),
  medium2: z.string().nullable().optional(),
  priceRange: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

/**
 * Artist response schema
 */
const artistResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

/**
 * Error response schema
 */
const errorResponseSchema = z.object({
  status: z.literal('error'),
  error: z.object({
    message: z.string(),
    code: z.string()
  }),
  timestamp: z.string().datetime()
});

/**
 * Success response wrapper
 */
const successResponseSchema = z.object({
  status: z.literal('success'),
  data: z.any(), // Data can be anything
  meta: z.object({
    timestamp: z.string().datetime()
  }).passthrough() // Allow additional meta fields
});

module.exports = {
  // Query parameter schemas
  paginationSchema,
  getArtworksSchema,
  getArtworkByIdSchema,
  getArtistsSchema,
  getArtistByIdSchema,
  searchSchema,
  getTrendingArtistsSchema,

  // Response schemas
  artworkResponseSchema,
  artistResponseSchema,
  errorResponseSchema,
  successResponseSchema
};
