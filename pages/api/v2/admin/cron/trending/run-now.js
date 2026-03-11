/**
 * Run Trending Computation Now
 *
 * POST /api/v2/admin/cron/trending/run-now
 *
 * Manually trigger trending computation immediately
 * Does not require cron job to be running
 */

import { runTrendingComputationNow } from '../../../../../../lib/cron/trendingCron.js';
import { withAdminAuth } from '../../../../../../lib/middleware/adminAuth.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await runTrendingComputationNow();

    if (result.success) {
      return res.status(200).json({
        status: 'success',
        message: result.message,
        data: result.data,
      });
    } else {
      return res.status(500).json({
        status: 'error',
        message: result.message,
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to run trending computation',
      error: error.message,
    });
  }
}

export default withAdminAuth(handler);
