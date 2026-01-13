/**
 * Simple Logger Utility
 *
 * Provides info, warn, and error logging
 * Can be extended later with Winston, Pino, or other logging frameworks
 */

function formatLog(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}${Object.keys(data).length ? ' ' + JSON.stringify(data) : ''}`;
}

const logger = {
  info(message, data) {
    console.log(formatLog('INFO', message, data));
  },

  warn(message, data) {
    console.warn(formatLog('WARN', message, data));
  },

  error(message, data) {
    console.error(formatLog('ERROR', message, data));
  },

  debug(message, data) {
    if (process.env.DEBUG === 'true') {
      console.log(formatLog('DEBUG', message, data));
    }
  }
};

module.exports = logger;
