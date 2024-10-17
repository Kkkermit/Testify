const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

function folderLoader(client) {

    client.logs.info(`[EVENTS] Started loading events...`);
    client.logs.success(`[EVENTS] Loaded ${client.eventNames().length} events.`);

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
    
    const triggerFolder = path.join(__dirname, '../triggers'); 
    client.logs.info(`[TRIGGERS] Started loading triggers...`);
    fs.readdir(triggerFolder, (err, files) => {
        if (err) {
            client.logs.error('[ERROR] Error reading trigger folder:', err);
            return;
        };
        client.logs.success(`[TRIGGERS] Loaded ${files.length} trigger files.`);
    });

    const scriptsFolder = path.join(__dirname, '../scripts');
    client.logs.info(`[SCRIPTS] started loading scripts...`)
    fs.readdir(scriptsFolder, (err, files) => {
        if(err) {
            client.logs.error('[ERROR] Error reading scripts folder:', err);
            return;
        };
        client.logs.success(`[SCRIPTS] Loaded ${files.length} script files.`);
    });

    const clientFolder = path.join(__dirname, '../client');
    client.logs.info(`[CLIENT] Started loading client files...`);
    fs.readdir(clientFolder, (err, files) => {
        if(err) {
            client.logs.error('[ERROR] Error reading client folder:', err);
            return;
        };
        client.logs.success(`[CLIENT] Loaded ${files.length} client files.`);
    });
};

module.exports = folderLoader;