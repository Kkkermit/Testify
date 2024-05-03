const config = require('../config');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        client.logs.success(`[BOT] ${client.user.username} has been launched!`);
        client.logs.info(`[EVENTS] Started loading events...`)
        client.logs.success(`[EVENTS] Loaded ${client.eventNames().length} events.`);
        
        const triggerFolder = path.join(__dirname, '../triggers'); 
        fs.readdir(triggerFolder, (err, files) => {
            if (err) {
                console.error('Error reading trigger folder:', err);
                return;
            }
            client.logs.info(`[TRIGGERS] Started loading triggers...`);
            client.logs.success(`[TRIGGERS] Loaded ${files.length} trigger files.`);
        });

        require('events').EventEmitter.defaultMaxListeners = config.eventListeners;
    },
};
