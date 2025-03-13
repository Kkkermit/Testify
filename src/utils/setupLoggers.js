const { setup: setupConsoleLogger } = require('../scripts/consoleLogger');
const { color, getTimestamp } = require('./loggingEffects');

/**
 * Sets up all logging mechanisms for the bot
 * @param {Object} client Discord.js client
 */
function setupLoggers(client) {
  try {
    const webhookUrl = process.env.LOG_WEBHOOK_URL || (client?.config?.logging?.webhookUrl);

    if (webhookUrl) {
      console.log(`${color.blue}[${getTimestamp()}] [LOGGING] Setting up Discord webhook logging${color.reset}`);
      setupConsoleLogger(webhookUrl);
    } else {
      console.warn(`${color.yellow}[${getTimestamp()}] [LOGGING] No LOG_WEBHOOK_URL found in environment variables${color.reset}`);
    }
  } catch (error) {
    console.error(`${color.red}[${getTimestamp()}] [LOGGING] Failed to setup loggers:${color.reset}`, error);
  }
}

module.exports = setupLoggers;
