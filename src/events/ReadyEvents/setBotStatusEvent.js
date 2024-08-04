const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    async execute(client) {
        
        client.logs.success(`[STATUS] Bot status loaded as ${client.config.status}.`);
        client.user.setStatus(client.config.status);
    }
}