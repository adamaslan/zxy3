/**
 * Admin Authentication Middleware
 *
 * Protects admin endpoints by requiring a secret key.
 * Set ADMIN_SECRET_KEY in your .env file.
 *
 * Usage:
 *   import { withAdminAuth } from '../../../../lib/middleware/adminAuth';
 *   export default withAdminAuth(handler);
 *
 * Clients must send one of:
 *   Authorization: Bearer <ADMIN_SECRET_KEY>
 *   x-admin-key: <ADMIN_SECRET_KEY>
 */

function withAdminAuth(handler) {
  return async (req, res) => {
    const secret = process.env.ADMIN_SECRET_KEY;

    if (!secret) {
      console.error('[AdminAuth] ADMIN_SECRET_KEY is not set');
      return res.status(500).json({
        status: 'error',
        error: { message: 'Server misconfiguration', code: 'SERVER_ERROR' }
      });
    }

    const authHeader = req.headers['authorization'];
    const keyHeader = req.headers['x-admin-key'];

    const provided =
      (authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null) || keyHeader || null;

    if (!provided || provided !== secret) {
      return res.status(401).json({
        status: 'error',
        error: { message: 'Unauthorized', code: 'UNAUTHORIZED' }
      });
    }

    return handler(req, res);
  };
}

module.exports = { withAdminAuth };
