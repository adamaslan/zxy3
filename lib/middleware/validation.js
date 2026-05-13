/**
 * Request Validation Middleware
 *
 * Validates incoming requests against Zod schemas
 * Provides structured error responses for invalid requests
 *
 * Usage:
 * const validateRequest = createRequestValidator(getArtworksSchema);
 * const validated = validateRequest(req);
 */

const { ZodError } = require('zod');

/**
 * Creates a validation middleware function
 *
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {string} source - Where to get data ('query', 'body', 'params')
 * @returns {Function} Middleware that validates and returns data or throws error
 */
function createRequestValidator(schema, source = 'query') {
  return (req) => {
    const data = req[source] || {};

    try {
      // Parse and validate
      const validated = schema.parse(data);
      return {
        success: true,
        data: validated
      };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          success: false,
          error: formatZodError(error),
          statusCode: 400
        };
      }
      throw error;
    }
  };
}

/**
 * Formats Zod validation errors into readable messages
 *
 * @param {ZodError} zodError - The Zod validation error
 * @returns {Object} Formatted error object
 */
function formatZodError(zodError) {
  const fieldErrors = {};

  zodError.errors.forEach(err => {
    const path = err.path.join('.');
    if (!fieldErrors[path]) {
      fieldErrors[path] = [];
    }
    fieldErrors[path].push(err.message);
  });

  return {
    message: 'Request validation failed',
    fields: fieldErrors,
    code: 'VALIDATION_ERROR'
  };
}

/**
 * Middleware wrapper that validates request before handler
 *
 * Usage:
 * export default withValidation(
 *   getArtworksSchema,
 *   'query',
 *   async (req, res, validated) => {
 *     // handler code
 *   }
 * );
 */
function withValidation(schema, source, handler) {
  const validator = createRequestValidator(schema, source);

  return async (req, res) => {
    // Only validate GET if source is query, POST if source is body
    if (source === 'query' && req.method !== 'GET') {
      return res.status(405).json({
        status: 'error',
        error: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }
      });
    }

    // Validate request
    const validation = validator(req);

    if (!validation.success) {
      return res.status(validation.statusCode).json({
        status: 'error',
        error: validation.error,
        timestamp: new Date().toISOString()
      });
    }

    // Call handler with validated data
    try {
      await handler(req, res, validation.data);
    } catch (error) {
      console.error(`Error in handler for ${req.method} ${req.url}:`, error);
      const statusCode = error.statusCode || 500;
      const code = error.code || 'INTERNAL_ERROR';
      res.status(statusCode).json({
        status: 'error',
        error: {
          message: error.message || 'Internal server error',
          code
        },
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Validates multiple sources (query, body, params)
 * Useful for POST/PUT endpoints
 */
function withMultiValidation(schemas, handler) {
  return async (req, res) => {
    const validated = {};

    // Validate each source if schema provided
    for (const [source, schema] of Object.entries(schemas)) {
      if (!schema) continue;

      const validator = createRequestValidator(schema, source);
      const validation = validator(req);

      if (!validation.success) {
        return res.status(validation.statusCode).json({
          status: 'error',
          error: {
            ...validation.error,
            source // Include which source failed
          },
          timestamp: new Date().toISOString()
        });
      }

      validated[source] = validation.data;
    }

    // Call handler with all validated data
    try {
      await handler(req, res, validated);
    } catch (error) {
      console.error(`Error in handler for ${req.method} ${req.url}:`, error);
      const statusCode = error.statusCode || 500;
      const code = error.code || 'INTERNAL_ERROR';
      res.status(statusCode).json({
        status: 'error',
        error: {
          message: error.message || 'Internal server error',
          code
        },
        timestamp: new Date().toISOString()
      });
    }
  };
}

module.exports = {
  createRequestValidator,
  formatZodError,
  withValidation,
  withMultiValidation
};
