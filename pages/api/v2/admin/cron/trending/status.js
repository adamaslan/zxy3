/**
 * Trending Cron Status
 *
 * GET /api/v2/admin/cron/trending/status
 *
 * Returns the current status of the trending computation cron job
 */

import { getTrendingCronStatus } from '../../../../../../lib/cron/trendingCron.js';
import { withAdminAuth } from '../../../../../../lib/middleware/adminAuth.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const status = getTrendingCronStatus();

    return res.status(200).json({
      status: 'success',
      data: status,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to get cron status',
      error: error.message,
    });
  }
}

export default withAdminAuth(handler);
