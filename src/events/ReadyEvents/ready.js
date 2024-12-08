const config = require('../../config');
const mongoose = require('mongoose');
const mongodbURL = process.env.mongodb;
const folderLoader = require('../../utils/folderLoader.js');
const { asciiText } = require('../../lib/asciiText.js')

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {

        client.logs.info(`[SCHEMAS] Started loading schemas...`);

        client.setMaxListeners(client.config.eventListeners || 20);

        if (!mongodbURL) {
            client.logs.error('[DATABASE] No MongoDB URL has been provided. Double check your .env file and make sure it is correct.');
            return;
        }

        try {
            mongoose.set("strictQuery", false);
            await mongoose.connect(mongodbURL || ``, {
                keepAlive: true,
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 10000,
            });
        } catch (err) {
            client.logs.error(`[DATABASE] Error connecting to the database: ${err}`);
            return;
        }

        folderLoader(client);
        asciiText(client)
    },
};
