const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    async execute(client) {
        
        client.logs.success(`[STATUS] ${client.user.username}'s status loaded as ${client.config.status}.`);
        client.user.setStatus(client.config.status);
    }
}