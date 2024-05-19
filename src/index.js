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

// Packages //

const { DisTube } = require("distube")
const { SpotifyPlugin } = require('@distube/spotify')
const { SoundCloudPlugin } = require('@distube/soundcloud')
const { YtDlpPlugin } = require('@distube/yt-dlp')

// Schemas //

const botSchema = require('./schemas/voiceChannelBotSystem');
const voiceSchema = require('./schemas/voiceChannelMembersSystem');

// Rotating Activity //

client.on("ready", async (client) => {
    setInterval(() => {

        let activities = [
            { type: 'Watching', name: `${client.commands.size} slash commands!`},
            { type: 'Watching', name: `${client.pcommands.size} prefix commands!`},
            { type: 'Watching', name: `${client.guilds.cache.size} servers!`},
            { type: 'Watching', name: `${client.guilds.cache.reduce((a,b) => a+b.memberCount, 0)} members!`},
            { type: 'Playing', name: `${client.config.prefix}help | @${client.user.username}`},
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
client.pcommands = new Collection();
client.aliases = new Collection();

require('dotenv').config();

const functions = fs.readdirSync("./src/functions").filter(file => file.endsWith(".js"));
const eventFiles = fs.readdirSync("./src/events").filter(file => file.endsWith(".js"));
const triggerFiles = fs.readdirSync("./src/triggers").filter(file => file.endsWith(".js"));
const pcommandFolders = fs.readdirSync('./src/prefix');
const commandFolders = fs.readdirSync("./src/commands");

(async () => {
    for (file of functions) {
        require(`./functions/${file}`)(client);
    }
    client.handleEvents(eventFiles, "./src/events");
    client.handleTriggers(triggerFiles, "./src/triggers")
    client.handleCommands(commandFolders, "./src/commands");
    client.prefixCommands(pcommandFolders, './src/prefix');
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
    const logchannelid = client.config.botJoinChannel;

    let theowner = process.env.devid; 
    const channel2 = await guild.channels.cache.random()
    const channelId = channel2.id;
    const invite = await guild.invites.create(channelId)

    await guild.fetchOwner().then(({ user }) => { theowner = user; }).catch(() => {});
    let embed = new EmbedBuilder()
    .setColor('Green')
    .setTitle(`__**Joined a New Server**__`)
    .setDescription(`${guild.name} has invited ${client.user.username} into their server`)
    .addFields(
        { name: "Guild Info", value: `>>> \`\`\`${guild.name} (${guild.id})\`\`\`` },
        { name: "Owner Info", value: `>>> \`\`\`${theowner ? `${theowner.tag} (${theowner.id})` : `${theowner} (${guild.ownerId})`}\`\`\`` },
        { name: "Member Count", value: `>>> \`\`\`${guild.memberCount}\`\`\`` },
        { name: "Server Number", value: `>>> \`\`\`${client.guilds.cache.size}\`\`\`` },
        { name: "Server Invite", value: `>>> \`\`\`${invite}\`\`\`` })
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .setFooter({ text: `Orbit ${client.guilds.cache.size}`, iconURL: client.user.avatarURL({ dynamic: true }) })
    .setTimestamp();

    const LogChannel = client.channels.cache.get(logchannelid) || await client.channels.fetch(logchannelid).catch(() => {}) || false;
    if (LogChannel) LogChannel.send({ embeds: [embed] }).catch(console.warn);

console.log(`${color.orange}[${getTimestamp()}]${color.reset} [GUILD_CREATE] ${client.user.username} has been added to a new guild. \n${color.orange}> GuildName: ${guild.name} \n> GuildID: ${guild.id} \n> Owner: ${theowner ? `${theowner.tag} (${theowner.id})` : `${theowner} (${guild.ownerId})`} \n> MemberCount: ${guild.memberCount} \n> ServerNumber: ${client.guilds.cache.size} \n> ServerInvite: ${invite}`)
});

// Guild Delete //

client.on("guildDelete", async guild => {
    const logchannelid = client.config.botLeaveChannel;

    let theowner = process.env.devid;

    await guild.fetchOwner().then(({ user }) => { theowner = user; }).catch(() => {});
    let embed = new EmbedBuilder()
    .setColor('Red')
    .setTitle(`__**Left a Server**__`)
    .setDescription(`${guild.name} has kicked/ban ${client.user.username} out of their server`)
    .addFields(
        { name: "Guild Info", value: `>>> \`\`\`${guild.name} (${guild.id})\`\`\`` },
        { name: "Owner Info", value: `>>> \`\`\`${theowner ? `${theowner.tag} (${theowner.id})` : `${theowner} (${guild.ownerId})`}\`\`\`` },
        { name: "Member Count", value: `>>> \`\`\`${guild.memberCount}\`\`\`` },
        { name: "Server Number", value: `>>> \`\`\`${client.guilds.cache.size}\`\`\`` })
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .setFooter({ text: `${client.user.username} ${client.guilds.cache.size}`, iconURL: client.user.avatarURL({ dynamic: true }) })
    .setTimestamp();

    const LogChannel = client.channels.cache.get(logchannelid) || await client.channels.fetch(logchannelid).catch(() => {}) || false;
    if (LogChannel) LogChannel.send({ embeds: [embed] }).catch(console.warn);

console.log(`${color.blue}[${getTimestamp()}]${color.reset} [GUILD_DELETE] ${client.user.username} has left a guild. \n${color.blue}> GuildName: ${guild.name} \n> GuildID: ${guild.id} \n> Owner: ${theowner ? `${theowner.tag} (${theowner.id})` : `${theowner} (${guild.ownerId})`} \n> MemberCount: ${guild.memberCount}`)
});

// Music System //

client.distube = new DisTube(client, {
    leaveOnStop: false,
    emitNewSongOnly: true,
    emitAddSongWhenCreatingQueue: false,
    emitAddListWhenCreatingQueue: false,
    plugins: [
        new SpotifyPlugin({
            emitEventsAfterFetching: true
        }),
    new SoundCloudPlugin(),
    new YtDlpPlugin()
    ]
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return
    const prefix = client.config.prefix
    if (!message.content.startsWith(prefix)) return
    const args = message.content.slice(prefix.length).trim().split(/ +/g)
    const command = args.shift().toLowerCase()
    const cmd = client.pcommands.get(command) || client.pcommands.get(client.aliases.get(command))
    if (!cmd) return

    const noVoiceChannel = new EmbedBuilder()
        .setColor(client.config.embedMusic)
        .setDescription(`${client.config.musicEmojiError} | You **must** be in a voice channel!`)

    if (cmd.inVoiceChannel && !message.member.voice.channel) {
        return message.channel.send({ embeds: [noVoiceChannel] })
    }
    try {
    } catch {
        message.channel.send(`${client.config.musicEmojiError} | Error: \`${error}\``)
    }
})

const status = queue =>
    `Volume: \`${queue.volume}%\` | Filter: \`${queue.filters.names.join(', ') || 'Off'}\` | Loop: \`${queue.repeatMode ? (queue.repeatMode === 2 ? 'All Queue' : 'This Song') : 'Off'
    }\` | Autoplay: \`${queue.autoplay ? 'On' : 'Off'}\``
client.distube
    .on('playSong', (queue, song) =>
        queue.textChannel.send({
            embeds: [new EmbedBuilder().setColor(client.config.embedMusic)
                .setDescription(`🎶 | Playing \`${song.name}\` - \`${song.formattedDuration}\`\nRequested by: ${song.user
                    }\n${status(queue)}`)]
        })
    )
    .on('addSong', (queue, song) =>
        queue.textChannel.send(
            {
                embeds: [new EmbedBuilder().setColor(client.config.embedMusic)
                    .setDescription(`🎶 | Added ${song.name} - \`${song.formattedDuration}\` to the queue by ${song.user}`)]
            }
        )
    )
    .on('addList', (queue, playlist) =>
        queue.textChannel.send(
            {
                embeds: [new EmbedBuilder().setColor(client.config.embedMusic)
                    .setDescription(`🎶 | Added \`${playlist.name}\` playlist (${playlist.songs.length
                        } songs) to queue\n${status(queue)}`)]
            }
        )
    )
    .on('error', (channel, e) => {
        if (channel) channel.send(`⛔ | An error encountered: ${e.toString().slice(0, 1974)}`)
        else console.error(e)
    })
    .on('empty', channel => channel.send({
        embeds: [new EmbedBuilder().setColor(client.config.embedMusic)
            .setDescription('⛔ |Voice channel is empty! Leaving the channel...')]
    }))
    .on('searchNoResult', (message, query) =>
        message.channel.send(
            {
                embeds: [new EmbedBuilder().setColor(client.config.embedMusic)
                    .setDescription('`⛔ | No result found for \`${query}\`!`')]
            })
    )
    .on('finish', queue => queue.textChannel.send({
        embeds: [new EmbedBuilder().setColor(client.config.embedMusic)
            .setDescription('🏁 | Queue finished!')]
    }))

// Command Logging //

client.on(Events.InteractionCreate, async interaction => {

    if (!interaction) return;
    if (!interaction.isChatInputCommand()) return;
    else {

        const channel = await client.channels.cache.get(client.config.commandLoggingChannel);
        const server = interaction.guild.name;
        const user = interaction.user.username;
        const userID = interaction.user.id;

        const embed = new EmbedBuilder()
        .setColor(client.config.embedColor)
        .setAuthor({ name: `${user} has used a command.`, iconURL: client.user.avatarURL({ dynamic: true })})
        .setTitle(`${client.user.username} Command Logger ${client.config.arrowEmoji}`)
        .addFields({ name: 'Server Name', value: `${server}`})
        .addFields({ name: 'Command', value: `\`\`\`${interaction}\`\`\``})
        .addFields({ name: 'User', value: `${user} | ${userID}`})
        .setTimestamp()
        .setFooter({ text: `Command Logger ${client.config.devBy}`, iconURL: interaction.user.avatarURL({ dynamic: true })})

        await channel.send({ embeds: [embed] });
    }
})

client.on(Events.MessageCreate, async message => {

    const prefix = client.config.prefix
    if (!message.author.bot && message.content.startsWith(prefix)) {

        const channel = await client.channels.cache.get(client.config.commandLoggingChannel);
        const server = message.guild.name;
        const user = message.author.username;
        const userID = message.author.id;

        const embed = new EmbedBuilder()
        .setColor(client.config.embedColor)
        .setAuthor({ name: `${user} has used a command.`, iconURL: client.user.avatarURL({ dynamic: true }) })
        .setTitle(`${client.user.username} Command Logger ${client.config.arrowEmoji}`)
        .addFields({ name: 'Server Name', value: `${server}` })
        .addFields({ name: 'Command', value: `\`\`\`${message.content}\`\`\`` })
        .addFields({ name: 'User', value: `${user} | ${userID}` })
        .setTimestamp()
        .setFooter({ text: `Command Logger ${client.config.devBy}`, iconURL: message.author.avatarURL({ dynamic: true }) })

        await channel.send({ embeds: [embed] });
    }
});

// Total Bots Voice Channel Code //

client.on(Events.GuildMemberAdd, async (member, err) => {

    if (member.guild === null) return;
    const botData = await botSchema.findOne({ Guild: member.guild.id });

    if (!botData) return;
    else {

        const botVoiceChannel = member.guild.channels.cache.get(botData.BotChannel);
        if (!botVoiceChannel || botVoiceChannel === null) return;
        const botsList = member.guild.members.cache.filter(member => member.user.bot).size;

        botVoiceChannel.setName(`• Total Bots: ${botsList}`).catch(err);

    }
})

client.on(Events.GuildMemberRemove, async (member, err) => {

    if (member.guild === null) return;
    const botData1 = await botSchema.findOne({ Guild: member.guild.id });

    if (!botData1) return;
    else {

        const botVoiceChannel1 = member.guild.channels.cache.get(botData1.BotChannel);
        if (!botVoiceChannel1 || botVoiceChannel1 === null) return;
        const botsList1 = member.guild.members.cache.filter(member => member.user.bot).size;

        botVoiceChannel1.setName(`• Total Bots: ${botsList1}`).catch(err);
    
    }
})

// Member Voice Channels Code //

client.on(Events.GuildMemberAdd, async (member, err) => {

    if (member.guild === null) return;
    const voiceData = await voiceSchema.findOne({ Guild: member.guild.id });

    if (!voiceData) return;
    else {

        const totalVoiceChannel = member.guild.channels.cache.get(voiceData.TotalChannel);
        if (!totalVoiceChannel || totalVoiceChannel === null) return;
        const totalMembers = member.guild.memberCount;

        totalVoiceChannel.setName(`• Total Members: ${totalMembers}`).catch(err);
    }
})

client.on(Events.GuildMemberRemove, async (member, err) => {

    if (member.guild === null) return;
    const voiceData1 = await voiceSchema.findOne({ Guild: member.guild.id });

    if (!voiceData1) return;
    else {

        const totalVoiceChannel1 = member.guild.channels.cache.get(voiceData1.TotalChannel);
        if (!totalVoiceChannel1 || totalVoiceChannel1 === null) return;
        const totalMembers1 = member.guild.memberCount;

        totalVoiceChannel1.setName(`• Total Members: ${totalMembers1}`).catch(err);
    }
})