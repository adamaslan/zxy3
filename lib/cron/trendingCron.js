/**
 * Trending Cron Job
 *
 * Periodically computes and updates trending rankings for all time windows
 * Supports start/stop controls for optional execution
 */

const cron = require('node-cron');
const { computeAllTrending } = require('../trending/calculator');
const { prisma } = require('../../prisma/globalprisma');
const logger = require('../logger/index');

let cronJob = null;
let isRunning = false;

/**
 * Start the trending computation cron job
 * Runs every hour at the top of the hour
 * Computes trending for all windows: 7d, 30d, 90d
 */
async function startTrendingCron() {
  if (isRunning) {
    logger.warn('Trending cron job is already running');
    return { success: false, message: 'Cron job already running' };
  }

  try {
    // Schedule: every hour at :00 (0 * * * *)
    cronJob = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Starting trending computation batch job');

        const result = await computeAllTrending(prisma);

        logger.info('Trending computation completed', {
          computed: result,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Error in trending computation batch job', {
          error: error.message,
          stack: error.stack,
        });
      }
    });

    isRunning = true;
    logger.info('Trending cron job started', {
      schedule: 'Every hour at :00',
      timestamp: new Date().toISOString(),
    });

    return { success: true, message: 'Cron job started' };
  } catch (error) {
    logger.error('Failed to start trending cron job', {
      error: error.message,
      stack: error.stack,
    });
    return { success: false, message: error.message };
  }
}

/**
 * Stop the trending computation cron job
 */
async function stopTrendingCron() {
  if (!isRunning || !cronJob) {
    logger.warn('Trending cron job is not running');
    return { success: false, message: 'Cron job not running' };
  }

  try {
    cronJob.stop();
    cronJob = null;
    isRunning = false;

    logger.info('Trending cron job stopped', {
      timestamp: new Date().toISOString(),
    });

    return { success: true, message: 'Cron job stopped' };
  } catch (error) {
    logger.error('Failed to stop trending cron job', {
      error: error.message,
      stack: error.stack,
    });
    return { success: false, message: error.message };
  }
}

/**
 * Check if cron job is running
 */
function isTrendingCronRunning() {
  return isRunning;
}

/**
 * Get cron job status
 */
function getTrendingCronStatus() {
  return {
    running: isRunning,
    schedule: '0 * * * * (every hour at :00)',
    nextRun: isRunning && cronJob ? getNextCronRun() : null,
  };
}

/**
 * Calculate next cron run time
 */
function getNextCronRun() {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(nextHour.getHours() + 1);
  nextHour.setMinutes(0);
  nextHour.setSeconds(0);
  nextHour.setMilliseconds(0);
  return nextHour.toISOString();
}

/**
 * Run trending computation immediately (manual trigger)
 */
async function runTrendingComputationNow() {
  try {
    logger.info('Manual trending computation triggered');

    const result = await computeAllTrending(prisma);

    logger.info('Manual trending computation completed', {
      computed: result,
      timestamp: new Date().toISOString(),
    });

    return { success: true, message: 'Computation completed', data: result };
  } catch (error) {
    logger.error('Manual trending computation failed', {
      error: error.message,
      stack: error.stack,
    });
    return { success: false, message: error.message };
  }
}

module.exports = {
  startTrendingCron,
  stopTrendingCron,
  isTrendingCronRunning,
  getTrendingCronStatus,
  runTrendingComputationNow,
};
