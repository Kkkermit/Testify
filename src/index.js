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

const { DisTube } = require("distube");
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtDlpPlugin } = require('@distube/yt-dlp');

// Schemas //

const botSchema = require('./schemas/voiceChannelBotSystem');
const voiceSchema = require('./schemas/voiceChannelMembersSystem');
const AuditLog = require('./schemas/auditLoggingSystem');
const levelSchema = require('./schemas/userLevelSystem');
const levelschema = require('./schemas/levelSetupSystem');
const roleSchema = require("./schemas/autoRoleSystem");

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

        const channel = await client.channels.cache.get(client.config.slashCommandLoggingChannel);
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

        const channel = await client.channels.cache.get(client.config.prefixCommandLoggingChannel);
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

// Audit Logging //

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId === 'selectLoggingLevel') {
        const selectedLevels = interaction.values;
        const guildId = interaction.guildId;

        await AuditLog.findOneAndUpdate(
            { Guild: guildId },
            { LogLevel: selectedLevels },
            { new: true, upsert: true }
        );

        const updatedSettings = await AuditLog.findOne({ Guild: guildId });
        const updatedSettingsList = updatedSettings.LogLevel.length > 0
            ? updatedSettings.LogLevel.map(level => `• ${level}`).join('\n')
            : 'None selected.';

        const updatedEmbed = new EmbedBuilder()
        .setAuthor({ name: `Audit Log Updated ${client.config.devBy}`, iconURL: interaction.guild.iconURL() })
        .setColor(client.config.embedAuditLogs)
        .setTitle(`${client.config.auditLogEmoji} Audit Log Settings Updated ${client.config.arrowEmoji}`)
        .setDescription(`Your audit log settings have been updated.\n\n**Current Logging Levels:**\n${updatedSettingsList}`)
        .setThumbnail(client.user.avatarURL())
        .setFooter({ text: "Audit log configuration." })
        .setTimestamp();

        await interaction.update({ embeds: [updatedEmbed] });
    }
});

client.on('interactionCreate', async (interaction) => {

    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId === "selectAuditLogChannel") {
        if (!interaction.guild) return interaction.reply({ content: "This command can *only* be used in a server.", ephemeral: true });

        const selectedChannelId = interaction.values[0];

        try {
            let data = await AuditLog.findOne({ Guild: interaction.guild.id });
    
            if (!data) {
                config = await AuditLog.create({
                    Guild: interaction.guild.id,
                    Channel: selectedChannelId,
                    LogLevel: []
                });
            } else {
                data.Channel = selectedChannelId;
                await data.save();
            }

            await interaction.reply({ content: `Audit log channel has been updated to <#${selectedChannelId}>.`, ephemeral: true });
        } catch (error) {
            client.logs.error("[AUDIT_LOGS] Error updating the audit log channel: ", error);
            await interaction.reply({ content: "There was an error while updating the audit log channel. Please try again later.", ephemeral: true });
        }
    }
});

client.on(Events.GuildMemberAdd, async (member) => {
    if (!member.guild || member.user.bot) return;

    const auditLogConfig = await AuditLog.findOne({ Guild: member.guild.id });
    if (!auditLogConfig || !Array.isArray(auditLogConfig.LogLevel) || !auditLogConfig.LogLevel.includes("guildMemberAdd")) return;

    const logChannel = member.guild.channels.cache.get(auditLogConfig.Channel);
    if (logChannel) {
        const embed = new EmbedBuilder()
        .setTitle("Logs | New Member Joined")
        .setColor(client.config.embedAuditLogs)
        .addFields([
            { name: "Member", value: `> ${member.user.tag} (${member.id})` },
            { name: "Total Members", value: `> ${member.guild.memberCount}` },
            { name: '\u200B', value: '> \u200B' },
            { name: "Joined", value: `> <t:${Math.floor(member.joinedTimestamp / 1000)}:F>` },
            { name: "User Joined Discord", value: `> <t:${Math.floor(member.user.createdAt.getTime() / 1000)}:R>` },
        ])
        .setDescription(`${member.user} Joined`)
        .setTimestamp()
        .setFooter({ text: `${client.user.username} Member Join Logs` })
        .setThumbnail(client.user.avatarURL({ dynamic: true}))

        await logChannel.send({ embeds: [embed] });
    }
});

client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
    if (!newChannel.guild) return;

    const auditLogConfig = await AuditLog.findOne({ Guild: newChannel.guild.id });
    if (!auditLogConfig || !Array.isArray(auditLogConfig.LogLevel) || !auditLogConfig.LogLevel.includes("channelUpdate")) return;

    const logChannel = newChannel.guild.channels.cache.get(auditLogConfig.Channel);
    if (!logChannel) return;

    let changes = [];
    
    if (oldChannel.name !== newChannel.name) {
        changes.push(`> Name from **${oldChannel.name}** to **${newChannel.name}**`);
    }
    
    if (oldChannel.topic !== newChannel.topic) {
        changes.push(`> Topic updated`);
    }
    
    if (oldChannel.nsfw !== newChannel.nsfw) {
        changes.push(`> NSFW status changed to **${newChannel.nsfw ? 'Yes' : 'No'}**`);
    }
    
    if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
        changes.push(`> Slow mode set to **${newChannel.rateLimitPerUser}** seconds`);
    }
    
    if (oldChannel.rawPosition !== newChannel.rawPosition) {
        changes.push(`> Position changed`);
    }
    
    if (JSON.stringify(oldChannel.permissionOverwrites.cache) !== JSON.stringify(newChannel.permissionOverwrites.cache)) {
        changes.push(`> Permissions modified`);
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
    .setTitle("Logs | Channel Updated")
    .setColor(client.config.embedAuditLogs)
    .setDescription(`**${newChannel.name}** was updated:\n- ${changes.join('\n- ')}`)
    .setTimestamp()
    .setFooter({ text: `${client.user.username} Channel Updated Logs` })
    .setThumbnail(client.user.avatarURL({ dynamic: true}))

    await logChannel.send({ embeds: [embed] });
});

client.on(Events.MessageDelete, async (message) => {
    if (!message.guild || message.system) return;
    if (message.author.bot) {
        return
    }

    const auditLogConfig = await AuditLog.findOne({ Guild: message.guild.id });
    if (!auditLogConfig || !Array.isArray(auditLogConfig.LogLevel) || auditLogConfig.LogLevel.length === 0) return;
    
    if (auditLogConfig.LogLevel.includes("messageDelete")) {
        const logChannel = client.channels.cache.get(auditLogConfig.Channel);
        if (logChannel) {
            let contentPreview = message.content.slice(0, 1024);
            if (!contentPreview) contentPreview = "No text content (could be an embed or attachment)";

            const embed = new EmbedBuilder()
            .setTitle("Logs | Message Deleted")
            .setColor(client.config.embedAuditLogs)
            .addFields(
                { name: "Author", value: `> ${message.author.tag}` },
                { name: "Channel", value: `> <#${message.channel.id}>` },
                { name: "Content", value: `> ${contentPreview}` },
            )
            .setDescription(`A message was deleted.`)
            .setTimestamp()
            .setFooter({ text: `${client.user.username} Message Deleted Logs`})
            .setThumbnail(client.user.avatarURL({ dynamic: true}))

            await logChannel.send({ embeds: [embed] });
        }
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (!message.guild || message.system) return;
    if (message.author.bot) {
        return
    }

    const auditLogConfig = await AuditLog.findOne({ Guild: message.guild.id });
    if (!auditLogConfig || !Array.isArray(auditLogConfig.LogLevel) || auditLogConfig.LogLevel.length === 0) return;
    
    if (auditLogConfig.LogLevel.includes("messageCreate")) {
        const logChannel = client.channels.cache.get(auditLogConfig.Channel);
        if (logChannel) {
            let contentPreview = message.content.slice(0, 1024);
            if (!contentPreview) contentPreview = "No text content (could be an embed or attachment)";

            const embed = new EmbedBuilder()
            .setTitle("Logs | Message Created")
            .setColor(client.config.embedAuditLogs)
            .addFields(
                { name: "Author", value: `> ${message.author.tag}` },
                { name: "Channel", value: `> <#${message.channel.id}>` },
                { name: "Content", value: `> ${contentPreview}` },
            )
            .setDescription(`A message was created.`)
            .setTimestamp()
            .setFooter({ text: `${client.user.username} Message Created Logs` })
            .setThumbnail(client.user.avatarURL({ dynamic: true}))

            await logChannel.send({ embeds: [embed] });
        }
    }
});

client.on(Events.ChannelCreate, async (channel) => {
    if (!channel.guild) return;

    const auditLogConfig = await AuditLog.findOne({ Guild: channel.guild.id });
    if (!auditLogConfig || !Array.isArray(auditLogConfig.LogLevel) || auditLogConfig.LogLevel.length === 0) return;

    if (auditLogConfig.LogLevel.includes("channelCreate")) {
        const logChannel = client.channels.cache.get(auditLogConfig.Channel);
        if (logChannel) {
            const embed = new EmbedBuilder()
            .setTitle("Logs | Channel Created")
            .setColor(client.config.embedAuditLogs)
            .addFields(
                { name: "Channel", value: `> <#${channel.id}>` },
                { name: "Channel Type", value: `> ${channel.type}` },
                { name: "Channel ID", value: `> ${channel.id}` },
            )
            .setThumbnail(client.user.avatarURL({ dynamic: true}))
            .setDescription(`A new channel was created.`)
            .setTimestamp()
            .setFooter({ text: `${client.user.username} Channel Creation Logs` });

            await logChannel.send({ embeds: [embed] });
        }
    }
});

client.on(Events.ChannelDelete, async (channel) => {
    if (!channel.guild) return;

    const auditLogConfig = await AuditLog.findOne({ Guild: channel.guild.id });
    if (!auditLogConfig || !Array.isArray(auditLogConfig.LogLevel) || auditLogConfig.LogLevel.length === 0) return;

    if (auditLogConfig.LogLevel.includes("channelDelete")) {
        const logChannel = client.channels.cache.get(auditLogConfig.Channel);
        if (logChannel) {
            const embed = new EmbedBuilder()
            .setTitle("Logs | Channel Deleted")
            .setColor(client.config.embedAuditLogs)
            .addFields(
                { name: "Channel Name", value: `> ${channel.name}` },
                { name: "Channel Type", value: `> ${channel.type}` },
                { name: "Channel ID", value: `> ${channel.id}` },
            )
            .setThumbnail(client.user.avatarURL({ dynamic: true}))
            .setDescription(`A channel was deleted.`)
            .setTimestamp()
            .setFooter({ text: `${client.user.username} Channel Deleted Logs` });

            await logChannel.send({ embeds: [embed] });
        }
    }
});

client.on(Events.GuildMemberRemove, async (member) => {
    const auditLogConfig = await AuditLog.findOne({ Guild: member.guild.id });
    if (!auditLogConfig || !Array.isArray(auditLogConfig.LogLevel) || auditLogConfig.LogLevel.length === 0) return;

    if (auditLogConfig.LogLevel.includes("guildMemberRemove")) {
        const logChannel = client.channels.cache.get(auditLogConfig.Channel);
        if (logChannel) {
            const embed = new EmbedBuilder()
            .setTitle("Logs | Member Left")
            .setColor(client.config.embedAuditLogs)
            .addFields(
                { name: "Member", value: `> ${member.user.tag} (${member.id})` },
                { name: "Username", value: `> ${member.user.username}` },
                { name: "Discriminator", value: `> #${member.user.discriminator}` },
                { name: "User ID", value: `> ${member.user.id}` },
                { name: "Joined", value: `> <t:${Math.floor(member.joinedTimestamp / 1000)}:F>` },
                { name: "Account Created", value: `> <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>` },
            )
            .setDescription(`A member has left or was kicked from the guild.`)
            .setThumbnail(client.user.avatarURL({ dynamic: true}))
            .setTimestamp()
            .setFooter({ text: `${client.user.username} Member Delete Logs` });

            if (member.user.displayAvatarURL()) {
                embed.setThumbnail(member.user.displayAvatarURL());
            }

            await logChannel.send({ embeds: [embed] });
        }
    }
});

client.on('roleCreate', async (role) => {
    const auditLogConfig = await AuditLog.findOne({ Guild: role.guild.id });
    if (!auditLogConfig || !Array.isArray(auditLogConfig.LogLevel) || auditLogConfig.LogLevel.length === 0 || !auditLogConfig.LogLevel.includes("roleCreate")) return;

    const logChannel = role.guild.channels.cache.get(auditLogConfig.Channel);
    if (!logChannel) return;

    const auditLogs = await role.guild.fetchAuditLogs({ type: Events.RoleCreate, limit: 1 });
    const roleCreateLog = auditLogs.entries.first();
    let executor = "Unknown";
    if (roleCreateLog) {
        const target = roleCreateLog.target;
        if (target && target.id === role.id) {
            executor = roleCreateLog.executor.tag;
        }
    }

    const embed = new EmbedBuilder()
    .setTitle("Logs | Role Created")
    .setColor(client.config.embedAuditLogs)
    .addFields(
        { name: "Role Name", value: `> ${role.name}` },
        { name: "Role ID", value: `> ${role.id}` },
        { name: "Created By", value: `> ${executor}` },
        { name: "Permissions", value: `> ${role.permissions.toString() ? "No Permissions Added" : role.permissions.toString()}` },
        { name: "Mentionable", value: `> ${role.mentionable ? "Yes" : "No"}` },
        { name: "Hoisted", value: `> ${role.hoist ? "Yes" : "No"}` },
    )
    .setTimestamp()
    .setThumbnail(client.user.avatarURL({ dynamic: true}))
    .setFooter({ text: `${client.user.username} Role Created Logs` });

    await logChannel.send({ embeds: [embed] });
});
client.on('roleUpdate', async (oldRole, newRole) => {
    const auditLogConfig = await AuditLog.findOne({ Guild: newRole.guild.id });
    if (!auditLogConfig || !Array.isArray(auditLogConfig.LogLevel) || auditLogConfig.LogLevel.length === 0 || !auditLogConfig.LogLevel.includes("roleUpdate")) return;

    const logChannel = await newRole.guild.channels.fetch(auditLogConfig.Channel).catch(console.error);
    if (!logChannel) return;

    let changes = [];

    if (oldRole.name !== newRole.name) {
        changes.push({ name: "Role Name", value: `From "${oldRole.name}" to "${newRole.name}"` });
    }

    const oldPermissions = new PermissionsBitField(oldRole.permissions.bitfield);
    const newPermissions = new PermissionsBitField(newRole.permissions.bitfield);
    const addedPermissions = newPermissions.remove(oldPermissions).toArray();
    const removedPermissions = oldPermissions.remove(newPermissions).toArray();

    if (addedPermissions.length > 0) {
        changes.push({ name: "Added Permissions", value: `> ${addedPermissions.join(", ")}` });
    }

    if (removedPermissions.length > 0) {
        changes.push({ name: "Removed Permissions", value: `> ${removedPermissions.join(", ")}` });
    }

    if (oldRole.mentionable !== newRole.mentionable) {
        changes.push({ name: "Mentionable", value: `Changed to "> ${newRole.mentionable ? 'Yes' : 'No'}"` });
    }
    
    if (oldRole.hoist !== newRole.hoist) {
        changes.push({ name: "Hoisted", value: `Changed to "> ${newRole.hoist ? 'Yes' : 'No'}"` });
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
    .setTitle("Logs | Role Updated")
    .setColor(client.config.embedAuditLogs) 
    .setThumbnail(client.user.avatarURL({ dynamic: true}))
    .addFields(changes)
    .setTimestamp()
    .setFooter({ text: `${client.user.username} Role Update Logs` });

    await logChannel.send({ embeds: [embed] });
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (oldMessage.author.bot || oldMessage.content === newMessage.content) return;

    const auditLogConfig = await AuditLog.findOne({ Guild: newMessage.guild.id });
    if (!auditLogConfig || !Array.isArray(auditLogConfig.LogLevel) || auditLogConfig.LogLevel.length === 0 || !auditLogConfig.LogLevel.includes("messageUpdate")) return;

    const logChannel = await newMessage.guild.channels.fetch(auditLogConfig.Channel).catch(console.error);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
    .setTitle("Logs | Message Edited")
    .setColor(client.config.embedAuditLogs)
    .setThumbnail(client.user.avatarURL({ dynamic: true}))
    .addFields(
        { name: "Author", value: `> ${newMessage.author.tag}` },
        { name: "Channel", value: `> ${newMessage.channel}` },
        { name: "Before", value: `> ${oldMessage.content ? oldMessage.content.substring(0, 1024) : "No Content / Embed"}` },
        { name: "After", value: `> ${newMessage.content.substring(0, 1024)}` },
        { name: "Message Link", value: `> [Jump to message](${newMessage.url})` },
    )
    .setTimestamp()
    .setFooter({ text: `${client.user.username} Message Edited Logs` });

    await logChannel.send({ embeds: [embed] });
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    if (!newState.guild) return;

    const auditLogConfig = await AuditLog.findOne({ Guild: newState.guild.id });
    if (!auditLogConfig || !Array.isArray(auditLogConfig.LogLevel) || !auditLogConfig.LogLevel.includes("voiceChannelActivity")) return;

    const logChannelId = auditLogConfig.Channel;
    const logChannel = newState.guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    let description = "";
    let memberCount = newState.channel ? newState.channel.members.size : 0;

    if (!oldState.channel && newState.channel) {
        description = `${newState.member.user.tag} joined **${newState.channel.name}**. \n> Members now: **${memberCount}**.`;
    }
    else if (oldState.channel && !newState.channel) {
        memberCount = oldState.channel.members.size;
        description = `${oldState.member.user.tag} left **${oldState.channel.name}**.`;
    }
    else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
        description = `${newState.member.user.tag} switched from **${oldState.channel.name}** to **${newState.channel.name}**.\n> Members now in new channel: **${memberCount}**.`;
    }

    if (description) {
        const embed = new EmbedBuilder()
        .setTitle("Logs | Voice Channel Activity")
        .setColor(client.config.embedAuditLogs)
        .setThumbnail(client.user.avatarURL({ dynamic: true}))
        .setDescription(description)
        .setTimestamp()
        .setFooter({ text: `${client.user.username} Voice Channel Activity Logs` });

        await logChannel.send({ embeds: [embed] });
    }
});

client.on(Events.InviteCreate, async (invite) => {
    if (!invite.guild) return;

    const auditLogConfig = await AuditLog.findOne({ Guild: invite.guild.id });
    if (!auditLogConfig || !Array.isArray(auditLogConfig.LogLevel) || !auditLogConfig.LogLevel.includes("inviteCreate")) return;

    const logChannelId = auditLogConfig.Channel;
    const logChannel = invite.guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    const expire = invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:F>` : 'Never';

    const embed = new EmbedBuilder()
    .setTitle("Logs | Invite Created")
    .setColor(client.config.embedAuditLogs)
    .setDescription(`An invite has been created by **${invite.inviter.tag}**.`)
    .setThumbnail(client.user.avatarURL({ dynamic: true}))
    .addFields(
        { name: "Channel", value: `> ${invite.channel.name}` },
        { name: "Code", value: `> ${invite.code}` },
        { name: "Expires", value: `> ${expire}` },
        { name: "Max Uses", value: `> ${invite.maxUses === 0 ? 'Unlimited' : invite.maxUses}` },
        { name: "Temporary", value: `> ${invite.temporary ? 'Yes' : 'No'}` },
        { name: "Max Age", value: `> ${invite.maxAge === 0 ? 'Unlimited' : `${invite.maxAge} seconds`}` }
    )
    .setFooter({ text: `${client.user.username} Invite Creation Logs`})
    .setAuthor({ name: `Invite ID: ${invite.code}`})
    .setTimestamp();

    await logChannel.send({ embeds: [embed] });
});

client.on(Events.EmojiCreate, async (emoji) => {
    const auditLogConfig = await AuditLog.findOne({ Guild: emoji.guild.id });
    if (!auditLogConfig || !Array.isArray(auditLogConfig.LogLevel) || !auditLogConfig.LogLevel.includes("emojiCreate")) return;

    const logChannel = emoji.guild.channels.cache.get(auditLogConfig.Channel);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
    .setTitle("Logs | Emoji Created")
    .setColor(client.config.embedAuditLogs)
    .setDescription(`A new emoji has been added to the guild.`)
    .addFields(
        { name: "Name", value: `> ${emoji.name}` },
        { name: "ID", value: `> ${emoji.id}` },
        { name: "Animated", value: `> ${emoji.animated ? 'Yes' : 'No'}` }
    )
    .setThumbnail(client.user.avatarURL({ dynamic: true}))
    .setFooter({ text: `${client.user.username} Emoji Creation Logs`})
    .setTimestamp();

    await logChannel.send({ embeds: [embed] });
});

client.on(Events.EmojiUpdate, async (oldEmoji, newEmoji) => {
    const auditLogConfig = await AuditLog.findOne({ Guild: newEmoji.guild.id });
    if (!auditLogConfig || !Array.isArray(auditLogConfig.LogLevel) || !auditLogConfig.LogLevel.includes("emojiUpdate")) return;

    const logChannel = newEmoji.guild.channels.cache.get(auditLogConfig.Channel);
    if (!logChannel) return;

    const changes = [];
    if (oldEmoji.name !== newEmoji.name) {
        changes.push(`Name: ${oldEmoji.name} ➔ ${newEmoji.name}`);
    }
    
    const embed = new EmbedBuilder()
    .setTitle("Logs | Emoji Updated")
    .setColor(client.config.embedAuditLogs)
    .setDescription(`An emoji has been updated.`)
    .addFields(
        { name: "Changes", value: `> ${changes.join('\n')}` }
    )
    .setThumbnail(client.user.avatarURL({ dynamic: true}))
    .setFooter({ text: `${client.user.username} Emoji Update Logs`})
    .setTimestamp();

    await logChannel.send({ embeds: [embed] });
});

client.on(Events.EmojiDelete, async (emoji) => {
    const auditLogConfig = await AuditLog.findOne({ Guild: emoji.guild.id });
    if (!auditLogConfig || !Array.isArray(auditLogConfig.LogLevel) || !auditLogConfig.LogLevel.includes("emojiDelete")) return;

    const logChannel = emoji.guild.channels.cache.get(auditLogConfig.Channel);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
    .setTitle("Logs | Emoji Deleted")
    .setColor(client.config.embedAuditLogs)
    .setDescription(`An emoji has been removed from the guild.`)
    .addFields(
        { name: "Name", value: `> ${emoji.name}` },
        { name: "ID", value: `> ${emoji.id}` },
        { name: "Animated", value: `> ${emoji.animated ? 'Yes' : 'No'}` },
        { name: "Deleted By", value: `> ${emoji.deletedBy ? emoji.deletedBy.tag : 'Unknown'}`}
    )
    .setThumbnail(client.user.avatarURL({ dynamic: true}))
    .setFooter({ text: `${client.user.username} Emoji Deletion Logs`})
    .setTimestamp();

    await logChannel.send({ embeds: [embed] });
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    const guild = newMember.guild;

    const auditLogConfig = await AuditLog.findOne({ Guild: guild.id });
    if (!auditLogConfig || !Array.isArray(auditLogConfig.LogLevel) || !auditLogConfig.LogLevel.includes("userUpdates")) return;

    const logChannelId = auditLogConfig.Channel;
    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    let description = "**User Update Detected**\n";
    let fieldsChanged = false;

    if (oldMember.nickname !== newMember.nickname) {
        description += `\n**Nickname Changed**\nFrom \`${oldMember.nickname || 'None'}\` to \`${newMember.nickname || 'None'}\``;
        fieldsChanged = true;
    }

    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;

    const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
    const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));

    if (addedRoles.size > 0) {
        description += `\n**Roles Added:** ${addedRoles.map(role => role.toString()).join(", ")}`;
        fieldsChanged = true;
    }
    if (removedRoles.size > 0) {
        description += `\n**Roles Removed:** ${removedRoles.map(role => role.toString()).join(", ")}`;
        fieldsChanged = true;
    }

    if (oldMember.communicationDisabledUntilTimestamp !== newMember.communicationDisabledUntilTimestamp) {
        const timeoutStatus = newMember.communicationDisabledUntilTimestamp ? `until <t:${Math.floor(newMember.communicationDisabledUntilTimestamp / 1000)}:f>` : 'removed';
        description += `\n**Timeout**\n> Timeout ${timeoutStatus}`;
        fieldsChanged = true;
    }

    if (!fieldsChanged) return;

    const embed = new EmbedBuilder()
    .setTitle(`Logs | User Update - ${newMember.user.tag}`)
    .setColor(client.config.embedAuditLogs)
    .setDescription(description)
    .setTimestamp()
    .setThumbnail(client.user.avatarURL({ dynamic: true}))
    .setFooter({ text: `User ID: ${newMember.id}` });

    await logChannel.send({ embeds: [embed] });
});

// Leveling System //

client.on(Events.MessageCreate, async (message, err) => {

    const { guild, author } = message;
    if (message.guild === null) return;
    const leveldata = await levelschema.findOne({ Guild: message.guild.id });

    if (!leveldata || leveldata.Disabled === 'disabled') return;
    let multiplier = 1;
    
    multiplier = Math.floor(leveldata.Multi);
    

    if (!guild || author.bot) return;

    levelSchema.findOne({ Guild: guild.id, User: author.id}, async (err, data) => {

        if (err) throw err;

        if (!data) {
            levelSchema.create({
                Guild: guild.id,
                User: author.id,
                XP: 0,
                Level: 0
            })
        }
    })

    const channel = message.channel;
    const give = 1;
    const data = await levelSchema.findOne({ Guild: guild.id, User: author.id});

    if (!data) return;

    const requiredXP = data.Level * data.Level * 20 + 20;

    if (data.XP + give >= requiredXP) {

        data.XP += give;
        data.Level += 1;
        await data.save();
        
        if (!channel) return;

        const levelEmbed = new EmbedBuilder()
        .setColor(client.config.embedLevels)
        .setAuthor({ name: `Leveling System ${client.config.devBy}` })
        .setTitle(`> ${client.user.username} Leveling System ${client.config.arrowEmoji}`)
        .setDescription(`\`\`\`${author.username} has leveled up to level ${data.Level}!\`\`\``)
        .setThumbnail(author.avatarURL({ dynamic: true }))
        .setFooter({ text: `${author.username} Leveled Up`})
        .setTimestamp()

        await message.channel.send({ embeds: [levelEmbed] }).catch(err => client.logs.error('[LEVEL_ERROR] Error sending level up message!'));
    } else {

        if(message.member.roles.cache.find(r => r.id === leveldata.Role)) {
            data.XP += give * multiplier;
        } data.XP += give;
        data.save();
    }
})

// Auto Role System //

client.on("guildMemberAdd", async member => {
    const { guild } = member;

    const data = await roleSchema.findOne({ GuildID: guild.id });
    if (!data) return;
    if (data.Roles.length < 0) return;
    for (const r of data.Roles) {
        await member.roles.add(r);
    }
})