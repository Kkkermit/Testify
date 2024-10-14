const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

function folderLoader(client) {
    if (mongoose.connect) {
        client.logs.success('[DATABASE] Connected to MongoDB successfully.');

        const schemaFolder = path.join(__dirname, '../schemas'); 
        fs.readdir(schemaFolder, (err, files) => {
            if (err) {
                client.logs.error('[ERROR] Error reading schemas folder:', err);
                return;
            };
            client.logs.success(`[SCHEMAS] Loaded ${files.length} schema files.`);
        });
    };

    client.logs.info(`[EVENTS] Started loading events...`);
    client.logs.success(`[EVENTS] Loaded ${client.eventNames().length} events.`);
    
    const triggerFolder = path.join(__dirname, '../triggers'); 
    fs.readdir(triggerFolder, (err, files) => {
        if (err) {
            client.logs.error('[ERROR] Error reading trigger folder:', err);
            return;
        };
        client.logs.info(`[TRIGGERS] Started loading triggers...`);
        client.logs.success(`[TRIGGERS] Loaded ${files.length} trigger files.`);
    });
}

module.exports = folderLoader;