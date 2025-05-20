// ████████╗███████╗███████╗████████╗██╗███████╗██╗   ██╗
// ╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝██║██╔════╝╚██╗ ██╔╝
//    ██║   █████╗  ███████╗   ██║   ██║█████╗   ╚████╔╝ 
//    ██║   ██╔══╝  ╚════██║   ██║   ██║██╔══╝    ╚██╔╝  
//    ██║   ███████╗███████║   ██║   ██║██║        ██║   
//    ╚═╝   ╚══════╝╚══════╝   ╚═╝   ╚═╝╚═╝        ╚═╝   

// Developed by: Kkermit. All rights reserved. (2025)
// MIT License

const { Client, Collection } = require(`discord.js`);
const fs = require('fs');
const config = require('./config');
const updateYTDLPackages = require('./scripts/ytdlUpdater');

// Utils //
const { intents, partials } = require('./utils/intents.js');
const { getTimestamp, color } = require('./utils/loggingEffects.js');
const setupLoggers = require('./utils/setupLoggers');

const botStartTime = Date.now();

// Run YTDL packages update at startup
console.log(`${color.blue}[${getTimestamp()}] [STARTUP] Running package updates for music functionality${color.reset}`);
updateYTDLPackages();

// Version Control //
const currentVersion = `${config.botVersion}`;

// Boot Mode //
require('./scripts/bootMode.js')();

// Set up environment variables
require('dotenv').config();

// Setup logging first to capture everything
setupLoggers();


let client;
try {
    client = new Client({ 
        intents: [...intents],  
        partials: [...partials],
    }); 
} catch (error) {
    console.error(`${color.red}[${getTimestamp()}]${color.reset} [ERROR] Error while creating the client. \n${color.red}[${getTimestamp()}]${color.reset} [ERROR]`, error);
};

const listeners = config.eventListeners || 20;

if (listeners > 0) {
    client.setMaxListeners(listeners);
} else {
    client.setMaxListeners(0);
}

client.logs = require('./utils/logs');
client.config = require('./config');

// Val Api //

client.swatch = null;
client.skins = null;
client.skinsTier = null;

// Packages //

const giveawayClient = require('./client/giveawayClientEvent.js');
const distubeClient = require('./client/distubeClientEvent.js');
const auditLogsClient = require('./client/auditLogsClientEvent.js');

const { handleLogs } = require("./events/CommandEvents/handleLogsEvent");
const { checkVersion } = require('./lib/version');
const { fetchValorantAPI } = require('./utils/fetchValorantApi.js');

require('./functions/processHandlers')();
require('./server/server.js')

client.commands = new Collection();
client.pcommands = new Collection();
client.aliases = new Collection();
client.reloadValoAPI = fetchValorantAPI;
client.botStartTime = botStartTime;

const functions = fs.readdirSync("./src/functions").filter(file => file.endsWith(".js"));
const triggerFiles = fs.readdirSync("./src/triggers").filter(file => file.endsWith(".js"));
const eventFiles = fs.readdirSync("./src/events")
const pcommandFolders = fs.readdirSync('./src/prefix');
const commandFolders = fs.readdirSync("./src/commands");

const token = process.env.token;
if (!token) {
    console.log(`${color.red}[${getTimestamp()}]${color.reset} [TOKEN] No token provided. Please provide a valid token in the .env file. ${config.botName} cannot launch without a token.`);
    return;
}

// Client Loader //

distubeClient(client);
giveawayClient(client);
auditLogsClient(client);

(async () => {
    for (file of functions) {
        require(`./functions/${file}`)(client);
    }
    client.handleEvents(eventFiles, "./src/events");
    client.handleTriggers(triggerFiles, "./src/triggers")
    client.handleCommands(commandFolders, "./src/commands");
    client.prefixCommands(pcommandFolders, './src/prefix');
    // Loads Val Api //
    await fetchValorantAPI(client);
    client.login(token).then(() => {
        handleLogs(client)
        checkVersion(currentVersion);
    }).catch((error) => {
        console.error(`${color.red}[${getTimestamp()}]${color.reset} [LOGIN] Error while logging into ${config.botName}. Check if your token is correct or double check your also using the correct intents. \n${color.red}[${getTimestamp()}]${color.reset} [LOGIN]`, error);
    });
})();
