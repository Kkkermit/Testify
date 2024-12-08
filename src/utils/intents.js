const { GatewayIntentBits, Partials } = require(`discord.js`);

const intents = [
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
]

const partials = [
    Partials.GuildMember, 
    Partials.Channel,
    Partials.GuildScheduledEvent,
    Partials.Message,
    Partials.Reaction, 
    Partials.ThreadMember, 
    Partials.User
]

module.exports = { intents, partials };