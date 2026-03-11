/**
 * Stop Trending Cron Job
 *
 * POST /api/v2/admin/cron/trending/stop
 *
 * Stops the background trending computation cron job
 */

import { stopTrendingCron } from '../../../../../../lib/cron/trendingCron.js';
import { withAdminAuth } from '../../../../../../lib/middleware/adminAuth.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await stopTrendingCron();

    if (result.success) {
      return res.status(200).json({
        status: 'success',
        message: result.message,
        data: { running: false },
      });
    } else {
      return res.status(400).json({
        status: 'error',
        message: result.message,
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to stop cron job',
      error: error.message,
    });
  }
}

export default withAdminAuth(handler);
