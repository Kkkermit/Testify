const prefixSchema = require('../schemas/prefixSystem.js');
const prefixSetupSchema = require('../schemas/prefixEnableSystem.js');

async function getMessagePrefix(message, client) {
	if (!message.guild) {
		return client.config.prefix;
	}

	try {
		const guildPrefixSettings = await prefixSetupSchema.findOne({ Guild: message.guild.id });
		if (!guildPrefixSettings || !guildPrefixSettings.Enabled) {
			return client.config.prefix;
		}

		const guildSettings = await prefixSchema.findOne({ Guild: message.guild.id });
		return guildSettings?.Prefix || client.config.prefix;
	} catch (error) {
		client.logs.error('[PREFIX_SYSTEM] Error fetching prefix:', error);
		return client.config.prefix;
	}
}

module.exports = { getMessagePrefix };