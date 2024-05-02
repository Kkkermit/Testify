const { 
    Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, Permissions, MessageManager, Embed, Collection, Events, Partials, ActivityType, Activity, AuditLogEvent, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType
    } = require(`discord.js`);
const fs = require('fs');

const client = new Client({ intents: [
    GatewayIntentBits.Guilds, 
	GatewayIntentBits.GuildMessages, 
	GatewayIntentBits.MessageContent, 
	GatewayIntentBits.GuildMembers, 
	GatewayIntentBits.GuildPresences, 
	GatewayIntentBits.GuildIntegrations, 
	GatewayIntentBits.GuildWebhooks, 
    GatewayIntentBits.GuildMessageReactions,
	GatewayIntentBits.MessageContent, 
	GatewayIntentBits.GuildEmojisAndStickers, 
	GatewayIntentBits.DirectMessages, 
	GatewayIntentBits.DirectMessageTyping, 
	GatewayIntentBits.GuildModeration, 
	GatewayIntentBits.GuildVoiceStates,
	GatewayIntentBits.GuildWebhooks, 
	GatewayIntentBits.AutoModerationConfiguration,
	GatewayIntentBits.GuildScheduledEvents, 
	GatewayIntentBits.GuildMessageTyping, 
	GatewayIntentBits.AutoModerationExecution, 
],  

partials: [
    Partials.GuildMember, 
    Partials.Channel,
    Partials.GuildScheduledEvent,
    Partials.Message,
    Partials.Reaction, 
    Partials.ThreadMember, 
    Partials.User
]

}); 

client.logs = require('./utils/logs');
client.config = require('./config');

// Rotating Activity //

client.on("ready", async (client) => {
    setInterval(() => {

        let activities = [
            { type: 'Watching', name: `${client.commands.size} commands!`},
            { type: 'Watching', name: `${client.guilds.cache.size} servers!`},
            { type: 'Watching', name: `${client.guilds.cache.reduce((a,b) => a+b.memberCount, 0)} members!`},
        ];

        const status = activities[Math.floor(Math.random() * activities.length)];

        if (status.type === 'Watching') {
            client.user.setPresence({ activities: [{ name: `${status.name}`, type: ActivityType.Watching }]});
        } else {
            client.user.setPresence({ activities: [{ name: `${status.name}`, type: ActivityType.Playing }]});
        } 
    }, 7500);
    client.logs.success(`[STATUS] Rotating status loaded successfully.`);
});

// Status //

client.on("ready", () => {

    client.logs.success(`[STATUS] Bot status loaded as ${client.config.status}.`);
    client.user.setStatus(client.config.status);
});

require('./functions/processHandlers')();

client.commands = new Collection();

require('dotenv').config();

const functions = fs.readdirSync("./src/functions").filter(file => file.endsWith(".js"));
const eventFiles = fs.readdirSync("./src/events").filter(file => file.endsWith(".js"));
const commandFolders = fs.readdirSync("./src/commands");

(async () => {
    for (file of functions) {
        require(`./functions/${file}`)(client);
    }
    client.handleEvents(eventFiles, "./src/events");
    client.handleCommands(commandFolders, "./src/commands");
    client.login(process.env.token)
})();

// Logging Effects //

const color = {
    red: '\x1b[31m',
    orange: '\x1b[38;5;202m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function getTimestamp() {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// Guild Create //

client.on("guildCreate", async guild => {

    let theowner = process.env.devid; 
    const channel2 = await guild.channels.cache.random()
    const channelId = channel2.id;
    const invite = await guild.invites.create(channelId)

    await guild.fetchOwner().then(({ user }) => { theowner = user; }).catch(() => {});

console.log(`${color.orange}[${getTimestamp()}]${color.reset} [GUILD_CREATE] ${client.user.username} has been added to a new guild. \n${color.orange}> GuildName: ${guild.name} \n> GuildID: ${guild.id} \n> Owner: ${theowner ? `${theowner.tag} (${theowner.id})` : `${theowner} (${guild.ownerId})`} \n> MemberCount: ${guild.memberCount} \n> ServerNumber: ${client.guilds.cache.size} \n> ServerInvite: ${invite}`)
});

// Guild Delete //

client.on("guildDelete", async guild => {

    let theowner = process.env.devid;

    await guild.fetchOwner().then(({ user }) => { theowner = user; }).catch(() => {});

console.log(`${color.blue}[${getTimestamp()}]${color.reset} [GUILD_DELETE] ${client.user.username} has left a guild. \n${color.blue}> GuildName: ${guild.name} \n> GuildID: ${guild.id} \n> Owner: ${theowner ? `${theowner.tag} (${theowner.id})` : `${theowner} (${guild.ownerId})`} \n> MemberCount: ${guild.memberCount}`)
});
