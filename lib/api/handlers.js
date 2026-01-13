/**
 * API Handler Utilities
 *
 * Provides base patterns for API v2 endpoints with:
 * - Error handling
 * - Request validation
 * - Response formatting
 * - Caching preparation
 */

/**
 * Standard API response format
 */
function successResponse(data, meta = {}) {
  return {
    status: 'success',
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };
}

function errorResponse(message, code = 'INTERNAL_ERROR', statusCode = 500) {
  return {
    status: 'error',
    error: {
      message,
      code
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Validates request data against a Zod schema
 * Throws validation error with details if invalid
 */
function validateRequest(data, schema) {
  const result = schema.safeParse(data);

  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(fieldErrors)
      .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
      .join('; ');

    const error = new Error(errorMessages);
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  return result.data;
}

/**
 * Creates a standard API handler with error handling
 *
 * Usage:
 * export default createHandler(async (req, res, { prisma }) => {
 *   const artworks = await prisma.artwork.findMany();
 *   return successResponse(artworks);
 * });
 */
function createHandler(handlerFn) {
  return async (req, res) => {
    try {
      // Import Prisma client at runtime
      const { prisma } = await import('../../prisma/globalprisma.js');

      // Call the handler function
      const result = await handlerFn(req, res, { prisma });

      // If handler already sent response, return early
      if (res.headersSent) {
        return;
      }

      // Send the response
      res.status(result.statusCode || 200).json(result.data || result);

    } catch (error) {
      // Log the error
      console.error(`Error handling ${req.method} ${req.url}`, {
        error: error.message,
        stack: error.stack
      });

      // Determine status code
      const statusCode = error.statusCode || 500;
      const code = error.code || 'INTERNAL_ERROR';
      const message = error.message || 'An unexpected error occurred';

      res.status(statusCode).json({
        status: 'error',
        error: {
          message,
          code
        },
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Converts BigInt values to strings in a response
 * Necessary for JSON serialization (BigInt not JSON serializable)
 */
function serializeBigInt(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  if (typeof obj === 'object') {
    const serialized = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeBigInt(value);
    }
    return serialized;
  }

  return obj;
}

/**
 * Handles GET requests with optional pagination and filtering
 *
 * Provides:
 * - Query parameter validation
 * - Default pagination (limit=20, offset=0)
 * - Count query for total records
 */
async function handleGetList(req, res, { prisma, model, schema }) {
  const query = validateRequest(req.query, schema);

  const limit = Math.min(query.limit || 20, 100); // Max 100 per request
  const offset = query.offset || 0;

  // Build Prisma query
  const findArgs = {
    skip: offset,
    take: limit,
    orderBy: query.orderBy || { createdAt: 'desc' }
  };

  if (query.where) {
    findArgs.where = query.where;
  }

  // Execute queries
  const [items, total] = await Promise.all([
    prisma[model].findMany(findArgs),
    prisma[model].count({ where: findArgs.where })
  ]);

  return {
    data: successResponse(
      serializeBigInt(items),
      {
        pagination: {
          offset,
          limit,
          total,
          hasMore: offset + items.length < total
        }
      }
    ),
    statusCode: 200
  };
}

/**
 * Handles GET by ID requests
 */
async function handleGetById(req, res, { prisma, model, idField = 'id' }) {
  const id = req.query.id;

  if (!id) {
    throw Object.assign(new Error('ID parameter required'), {
      statusCode: 400,
      code: 'MISSING_ID'
    });
  }

  // Try to parse as BigInt if applicable
  let parsedId = id;
  try {
    parsedId = BigInt(id);
  } catch {
    // If BigInt parsing fails, use as string
    parsedId = id;
  }

  const item = await prisma[model].findUnique({
    where: { [idField]: parsedId }
  });

  if (!item) {
    throw Object.assign(
      new Error(`${model} with id '${id}' not found`),
      {
        statusCode: 404,
        code: 'NOT_FOUND'
      }
    );
  }

  return {
    data: successResponse(serializeBigInt(item)),
    statusCode: 200
  };
}

module.exports = {
  createHandler,
  successResponse,
  errorResponse,
  validateRequest,
  serializeBigInt,
  handleGetList,
  handleGetById
};
