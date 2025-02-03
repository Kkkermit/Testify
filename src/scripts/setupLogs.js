const fs = require("fs");
const path = require("path");
const { color, getTimestamp } = require("../utils/loggingEffects");

console.log(`${color.pink}[${getTimestamp()}] ${color.reset}[SET_AUDIT_LOGS] Updating discord-logs module...`);

const filePath = path.join(__dirname, "../../node_modules/discord-logs/lib/index.js");
const newContent = `"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

const color = {
    red: '\\x1b[31m',
    orange: '\\x1b[38;5;202m',
    yellow: '\\x1b[33m',
    green: '\\x1b[32m',
    blue: '\\x1b[34m',
    reset: '\\x1b[0m',
    pink: '\\x1b[38;5;213m'
}

function getTimestamp() {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return \`\${year}-\${month}-\${day} \${hours}:\${minutes}:\${seconds}\`;
}

const discord_js_1 = require("discord.js");
const handlers_1 = require("./handlers");
let eventRegistered = false;
module.exports = (client, options) => __awaiter(void 0, void 0, void 0, function* () {
    if (eventRegistered)
        return;
    eventRegistered = true;
    const intents = new discord_js_1.IntentsBitField(client.options.intents);
    /* HANDLE GUILDS EVENTS */
    if (intents.has(discord_js_1.IntentsBitField.Flags.Guilds)) {
        if (options === null || options === void 0 ? void 0 : options.debug)
            console.log(\`\${color.pink}[\${getTimestamp()}] \${color.reset}[AUDIT_LOGS] ChannelUpdate event handler registered.\`);
        client.on('channelUpdate', (oldChannel, newChannel) => {
            (0, handlers_1.handleChannelUpdateEvent)(client, oldChannel, newChannel);
        });
        if (options === null || options === void 0 ? void 0 : options.debug)
            console.log(\`\${color.pink}[\${getTimestamp()}] \${color.reset}[AUDIT_LOGS] GuildUpdate event handler registered.\`);
        client.on('guildUpdate', (oldGuild, newGuild) => {
            (0, handlers_1.handleGuildUpdateEvent)(client, oldGuild, newGuild);
        });
        if (options === null || options === void 0 ? void 0 : options.debug)
            console.log(\`\${color.pink}[\${getTimestamp()}] \${color.reset}[AUDIT_LOGS] RoleUpdate event handler registered.\`);
        client.on('roleUpdate', (oldRole, newRole) => {
            (0, handlers_1.handleRoleUpdateEvent)(client, oldRole, newRole);
        });
        if (options === null || options === void 0 ? void 0 : options.debug)
            console.log(\`\${color.pink}[\${getTimestamp()}] \${color.reset}[AUDIT_LOGS] ThreadUpdate event handler registered.\`);
        client.on('threadUpdate', (oldThread, newThread) => {
            (0, handlers_1.handleThreadChannelUpdateEvent)(client, oldThread, newThread);
        });
    }
    else {
        if (options === null || options === void 0 ? void 0 : options.debug)
            console.log('channelUpdate, guildUpdate, roleUpdate and threadUpdate event handlers not registered (missing Guilds intent).');
    }
    /* HANDLE MEMBER EVENTS */
    if (intents.has(discord_js_1.IntentsBitField.Flags.GuildMembers)) {
        if (options === null || options === void 0 ? void 0 : options.debug)
            console.log(\`\${color.pink}[\${getTimestamp()}] \${color.reset}[AUDIT_LOGS] GuildMemberUpdate event handler registered.\`);
        client.on('guildMemberUpdate', (oldMember, newMember) => {
            (0, handlers_1.handleGuildMemberUpdateEvent)(client, oldMember, newMember);
        });
        if (options === null || options === void 0 ? void 0 : options.debug)
            console.log(\`\${color.pink}[\${getTimestamp()}] \${color.reset}[AUDIT_LOGS] UserUpdate event handler registered.\`);
        client.on('userUpdate', (oldUser, newUser) => {
            (0, handlers_1.handleUserUpdateEvent)(client, oldUser, newUser);
        });
    }
    else {
        if (options === null || options === void 0 ? void 0 : options.debug)
            console.log('guildMemberUpdate, userUpdate event handlers not registered (missing GuildMembers intent).');
    }
    /* HANDLE MESSAGE UPDATE EVENTS */
    if (intents.has(discord_js_1.IntentsBitField.Flags.GuildMessages && discord_js_1.IntentsBitField.Flags.MessageContent)) {
        if (options === null || options === void 0 ? void 0 : options.debug)
            console.log(\`\${color.pink}[\${getTimestamp()}] \${color.reset}[AUDIT_LOGS] MessageUpdate event handler registered.\`);
        client.on('messageUpdate', (oldMessage, newMessage) => {
            (0, handlers_1.handleMessageUpdateEvent)(client, oldMessage, newMessage);
        });
    }
    else {
        if (options === null || options === void 0 ? void 0 : options.debug)
            console.log('messageUpdate event handler not registered (missing GuildMessages or MessageContent intent).');
    }
    /* HANDLE PRESENCE UPDATE EVENTS */
    if (intents.has(discord_js_1.IntentsBitField.Flags.GuildPresences)) {
        if (options === null || options === void 0 ? void 0 : options.debug)
            console.log(\`\${color.pink}[\${getTimestamp()}] \${color.reset}[AUDIT_LOGS] PresenceUpdate event handler registered.\`);
        client.on('presenceUpdate', (oldPresence, newPresence) => {
            (0, handlers_1.handlePresenceUpdateEvent)(client, oldPresence, newPresence);
        });
    }
    else {
        if (options === null || options === void 0 ? void 0 : options.debug)
            console.log('presenceUpdate event handler not registered (missing GuildPresences intent).');
    }
    /* HANDLE VOICE STATE UPDATE */
    if (intents.has(discord_js_1.IntentsBitField.Flags.GuildVoiceStates)) {
        if (options === null || options === void 0 ? void 0 : options.debug)
            console.log(\`\${color.pink}[\${getTimestamp()}] \${color.reset}[AUDIT_LOGS] VoiceStateUpdate event handler registered.\`);
        client.on('voiceStateUpdate', (oldState, newState) => {
            (0, handlers_1.handleVoiceStateUpdateEvent)(client, oldState, newState);
        });
    }
    else {
        if (options === null || options === void 0 ? void 0 : options.debug)
            console.log('voiceStateUpdate event handler not registered (missing GuildVoiceStates intent).');
    }
});
`;

fs.writeFileSync(filePath, newContent, "utf8");
console.log(`${color.pink}[${getTimestamp()}] ${color.reset}[SET_AUDIT_LOGS] Updated discord-logs module.`);
