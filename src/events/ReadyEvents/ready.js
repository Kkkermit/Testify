const config = require('../../config');
const mongoose = require('mongoose');
const mongodbURL = process.env.mongodb;
const folderLoader = require('../../utils/folderLoader.js');
const asciiText = require('../../lib/asciiText.js')

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
            serverSelectionTimeoutMS: 10000,
        });

        folderLoader(client);
        asciiText(client)
        require('events').EventEmitter.defaultMaxListeners = config.eventListeners;
    },
};
