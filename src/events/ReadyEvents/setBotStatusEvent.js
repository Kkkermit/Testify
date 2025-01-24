const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    async execute(client) {

        if (client.config.status) {
            client.logs.info(`[STATUS] Setting status...`);
            setStatus();
        } else {
            client.logs.error(`[STATUS] No status provided. Please provide a valid status in the config.js file.`);
        }

        function setStatus() {
            client.logs.success(`[STATUS] ${client.user.username}'s status loaded as ${client.config.status}.`);
            client.user.setStatus(client.config.status);
        }
    }
}