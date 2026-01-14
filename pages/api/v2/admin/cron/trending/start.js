/**
 * Start Trending Cron Job
 *
 * POST /api/v2/admin/cron/trending/start
 *
 * Starts the background trending computation cron job
 * Runs automatically every hour
 */

import { startTrendingCron } from '../../../../../../lib/cron/trendingCron.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await startTrendingCron();

    if (result.success) {
      return res.status(200).json({
        status: 'success',
        message: result.message,
        data: { running: true, schedule: 'Every hour at :00' },
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
      message: 'Failed to start cron job',
      error: error.message,
    });
  }
}
