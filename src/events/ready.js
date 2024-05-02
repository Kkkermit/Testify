const config = require('../config');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {

        client.logs.success(`[BOT] ${client.user.username} has been launched!`);
        client.logs.info(`[EVENTS] Started loading events...`)
        client.logs.success(`[EVENTS] Loaded ${client.eventNames().length} events.`);

        require('events').EventEmitter.defaultMaxListeners = config.eventListeners;
    },
};