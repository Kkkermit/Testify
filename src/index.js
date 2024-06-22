
// ████████╗███████╗███████╗████████╗██╗███████╗██╗   ██╗
// ╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝██║██╔════╝╚██╗ ██╔╝
//    ██║   █████╗  ███████╗   ██║   ██║█████╗   ╚████╔╝ 
//    ██║   ██╔══╝  ╚════██║   ██║   ██║██╔══╝    ╚██╔╝  
//    ██║   ███████╗███████║   ██║   ██║██║        ██║   
//    ╚═╝   ╚══════╝╚══════╝   ╚═╝   ╚═╝╚═╝        ╚═╝   

// Developed by: Kkermit. All rights reserved. (2021)
// MIT License

const { 
    Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, Permissions, MessageManager, Embed, Collection, Events, Partials, ActivityType, Activity, AuditLogEvent, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType
} = require(`discord.js`);
const fs = require('fs');
const config = require('./config')

// Version Control //

const currentVersion = `${config.botVersion}`;

let client;
try{
    client = new Client({ 
        intents: [
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
        ],
    }); 
} catch (error) {
    console.error(`${color.red}[${getTimestamp()}]${color.reset} [ERROR] Error while creating the client. \n${color.red}[${getTimestamp()}]${color.reset} [ERROR]`, error);
};

client.logs = require('./utils/logs');
client.config = require('./config');

// Packages //

const { DisTube } = require("distube");
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const GiveawaysManager = require("./utils/giveaway");
const { handleLogs } = require("./events/handleLogs");
const Logs = require('discord-logs');
const { CaptchaGenerator } = require('captcha-canvas');
const { createCanvas } = require('canvas');
const { checkVersion } = require('./lib/version')

// Schemas //

const botSchema = require('./schemas/voiceChannelBotSystem');
const voiceSchema = require('./schemas/voiceChannelMembersSystem');
const levelSchema = require('./schemas/userLevelSystem');
const levelschema = require('./schemas/levelSetupSystem');
const roleSchema = require("./schemas/autoRoleSystem");
const capschema = require('./schemas/verifySystem');
const verifyusers = require('./schemas/verifyUsersSystem');
const linkSchema = require('./schemas/antiLinkSystem');
const warningSchema = require('./schemas/warningSystem');

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
    client.login(process.env.token).then(() => {
        handleLogs(client)
        checkVersion(currentVersion);
    }).catch((error) => {
        console.error(`${color.red}[${getTimestamp()}]${color.reset} [LOGIN] Error while logging in. Check if your token is correct or double check your also using the correct intents. \n${color.red}[${getTimestamp()}]${color.reset} [LOGIN]`, error);
    });
})();

// Logging Effects //

const color = {
    red: '\x1b[31m',
    orange: '\x1b[38;5;202m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    pink: '\x1b[38;5;213m',
    torquise: '\x1b[38;5;45m',
    purple: '\x1b[38;5;57m',
    reset: '\x1b[0m'
}

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

// Giveaway Manager //

client.giveawayManager = new GiveawaysManager(client, {
    default: {
        botsCanWin: false,
        embedColor: "#a200ff",
        embedColorEnd: "#550485",
        reaction: "🎉",
    },
});

// Audit Logging System //

process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on("uncaughtException", (err) => {
    console.log("Uncaught Exception:", err);
});

Logs(client, {
    debug: true
});

// Verify System //

client.on(Events.InteractionCreate, async interaction => {

    if (interaction.customId === 'verify') {

        if (interaction.guild === null) return;

        const verifydata = await capschema.findOne({ Guild: interaction.guild.id });
        const verifyusersdata = await verifyusers.findOne({ Guild: interaction.guild.id, User: interaction.user.id });

        if (!verifydata) return await interaction.reply({ content: `The **verification system** has been disabled in this server!`, ephemeral: true});

        if (verifydata.Verified.includes(interaction.user.id)) return await interaction.reply({ content: 'You have **already** been verified!', ephemeral: true});
        
        function generateCaptcha(length) {
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let captcha = '';
            for (let i = 0; i < length; i++) {
                captcha += characters.charAt(Math.floor(Math.random() * characters.length));
            }
            return captcha;
        }

        async function generateCaptchaImage(text) {
            const canvas = createCanvas(450,150);
            const ctx = canvas.getContext('2d');

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#FF0000'; 
            ctx.font = 'bold 100px Arial'; 
            ctx.textAlign = 'center'; 
            ctx.textBaseline = 'middle';
            ctx.fillText(text, canvas.width / 2, canvas.height / 2); 

            return canvas.toBuffer();
        }

        const captchaText = generateCaptcha(5); 
        generateCaptchaImage(captchaText).then(async (buffer) => {

            const attachment = new AttachmentBuilder(buffer, { name: `captcha.png`});

            const verifyembed = new EmbedBuilder()
            .setColor(client.config.embedVerify)
            .setAuthor({ name: `Verification System ${client.config.devBy}`})
            .setFooter({ text: `Verification Captcha`})
            .setTimestamp()
            .setImage('attachment://captcha.png')
            .setThumbnail(interaction.guild.iconURL())
            .setTitle('> Verification Step: Captcha')
            .setDescription(`**Verify value**: \n> *Please use the button bellow to submit your captcha!*`)
        
            const verifybutton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                .setLabel('Enter Captcha')
                .setStyle(ButtonStyle.Success)
                .setCustomId('captchaenter')
            )

            await interaction.reply({ embeds: [verifyembed], components: [verifybutton], files: [attachment], ephemeral: true });
        
            if (verifyusersdata) {

                await verifyusers.deleteMany({
                    Guild: interaction.guild.id,
                    User: interaction.user.id
                })
                await verifyusers.create ({
                    Guild: interaction.guild.id,
                    User: interaction.user.id,
                    Key: captchaText
                })
            } else {
                await verifyusers.create ({
                    Guild: interaction.guild.id,
                    User: interaction.user.id,
                    Key: captchaText
                })
            }
        })
        .catch(error => {
            client.logs.error('[VERIFY_ERROR] An error occurred while generating the captcha:', error);
        });
    } else if (interaction.customId === 'captchaenter') {
        const vermodal = new ModalBuilder()
            .setTitle(`Verification`)
            .setCustomId('vermodal')

            const answer = new TextInputBuilder()
            .setCustomId('answer')
            .setRequired(true)
            .setLabel('Please submit your Captcha code')
            .setPlaceholder(`Your captcha code input`)
            .setStyle(TextInputStyle.Short)

            const vermodalrow = new ActionRowBuilder().addComponents(answer);
            vermodal.addComponents(vermodalrow);

        await interaction.showModal(vermodal);
    } else if (interaction.customId === 'vermodal') {
        if (!interaction.isModalSubmit()) return;

        const userverdata = await verifyusers.findOne({ Guild: interaction.guild.id, User: interaction.user.id });
        const verificationdata = await capschema.findOne({ Guild: interaction.guild.id });
    
        if (verificationdata.Verified.includes(interaction.user.id)) return await interaction.reply({ content: `You have **already** verified within ${interaction.guild.name}!`, ephemeral: true});
    
        const modalanswer = interaction.fields.getTextInputValue('answer');
        if (modalanswer === userverdata.Key) {
    
            const verrole = interaction.guild.roles.cache.get(verificationdata.Role);
    
            try {
                await interaction.member.roles.add(verrole);
            } catch (err) {
                return await interaction.reply({ content: `There was an **issue** giving you the **<@&${verificationdata.Role}>** role, try again later!`, ephemeral: true})
            }

            await capschema.updateOne({ Guild: interaction.guild.id }, { $push: { Verified: interaction.user.id }});
            try {
                await interaction.reply({ content: 'You have been **verified!**', ephemeral: true});
            } catch (err) {
                client.logs.error(`[VERIFY_ERROR] Error replying to the user that he has been verified!`);
                return;
            } 
        } else {
            await interaction.reply({ content: `**Oops!** It looks like you **didn't** enter the valid **captcha code**!`, ephemeral: true})
        }
    }
});

client.on('guildMemberRemove', async member => {
    try {
        const userId = member.user.id;
        const userverdata = await verifyusers.findOne({ Guild: member.guild.id, User: userId });
        const verificationdata = await capschema.findOne({ Guild: member.guild.id });
        if (userverdata && verificationdata) {
            await capschema.updateOne({ Guild: member.guild.id },{ $pull: { Verified: userId } });
            await verifyusers.deleteOne({ Guild: member.guild.id, User: userId });
        }
    } catch (err) {
        client.logs.error(`[VERIFY_ERROR] Error deleting the data from the user that left the server!`);
    }
});

// Anti Link System //

client.on(Events.MessageCreate, async (message) => {

    if (message.guild === null) return;
    
    if (message.content.startsWith('http') || message.content.startsWith('discord.gg') || message.content.includes('https://') || message.content.includes('http://') || message.content.includes('discord.gg/') || message.content.includes('www.') || message.content.includes('.net') || message.content.includes('.com')) {

        const Data = await linkSchema.findOne({ Guild: message.guild.id });

        if (!Data) return;

        const memberPerms = Data.Perms;

        const user = message.author;
        const member = message.guild.members.cache.get(user.id);

        const embed = new EmbedBuilder()
        .setColor(client.config.embedModHard)
        .setAuthor({ name: `Anti-link system ${client.config.devBy}`})
        .setTitle(`${client.config.modEmojiHard} ${client.user.username} Anti-link system ${client.config.arrowEmoji}`)
        .setDescription(`> Link detected and deleted successfully! \n> ${message.author}, links are **disabled** in **${message.guild.name}**. Please **do not** send links in this server!`)
        .setFooter({ text: 'Anti-link detected a link'})
        .setThumbnail(client.user.avatarURL())
        .setTimestamp()

        if (member.permissions.has(memberPerms)) return;
        else {
            await message.channel.send({ embeds: [embed] }).then (msg => {
                setTimeout(() => msg.delete(), 5000)
            })

            ;(await message).delete();

            warningSchema.findOne({ GuildID: message.guild.id, UserID: message.author.id, UserTag: message.author.tag }, async (err, data) => {

                if (err) throw err;
    
                if (!data) {
                    data = new warningSchema({
                        GuildID: message.guild.id,
                        UserID: message.author.id,
                        UserTag: message.author.tag,
                        Content: [
                            {
                                ExecuterId: '1211784897627168778',
                                ExecuterTag: 'Testify#0377',
                                Reason: 'Use of forbidden links'
                            }
                        ],
                    });
                } else {
                    const warnContent = {
                        ExecuterId: '1211784897627168778',
                        ExecuterTag: 'Testify#0377',
                        Reason: 'Use of forbidden links'
                    }
                    data.Content.push(warnContent);
                }
                data.save()
            })
        }
    }
})
