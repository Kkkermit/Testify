const config = require('../config');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const mongodbURL = process.env.mongodb;

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {

        client.logs.info(`[SCHEMAS] Started loading schemas...`);

        if (!mongodbURL) return;

        mongoose.set("strictQuery", false);
        await mongoose.connect(mongodbURL || ``, {
            keepAlive: true,
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })

        if (mongoose.connect) {
            client.logs.success('[DATABASE] Connected to MongoDB successfully.')

            const schemaFolder = path.join(__dirname, '../schemas'); 
            fs.readdir(schemaFolder, (err, files) => {
                if (err) {
                    client.logs.error('[ERROR] Error reading schemas folder:', err);
                    return;
                }
                client.logs.success(`[SCHEMAS] Loaded ${files.length} schema files.`);
            });
        }

        client.logs.logging(`[BOT] ${client.user.username} has been launched!`);
        client.logs.info(`[EVENTS] Started loading events...`)
        client.logs.success(`[EVENTS] Loaded ${client.eventNames().length} events.`);
        
        const triggerFolder = path.join(__dirname, '../triggers'); 
        fs.readdir(triggerFolder, (err, files) => {
            if (err) {
                client.logs.error('Error reading trigger folder:', err);
                return;
            }
            client.logs.info(`[TRIGGERS] Started loading triggers...`);
            client.logs.success(`[TRIGGERS] Loaded ${files.length} trigger files.`);
        });

        require('events').EventEmitter.defaultMaxListeners = config.eventListeners;
    },
};
