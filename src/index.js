
// ████████╗███████╗███████╗████████╗██╗███████╗██╗   ██╗
// ╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝██║██╔════╝╚██╗ ██╔╝
//    ██║   █████╗  ███████╗   ██║   ██║█████╗   ╚████╔╝ 
//    ██║   ██╔══╝  ╚════██║   ██║   ██║██╔══╝    ╚██╔╝  
//    ██║   ███████╗███████║   ██║   ██║██║        ██║   
//    ╚═╝   ╚══════╝╚══════╝   ╚═╝   ╚═╝╚═╝        ╚═╝   

// Developed by: Kkermit. All rights reserved. (2024)
// MIT License

const { 
    Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, Permissions, MessageManager, Embed, Collection, Events, Partials, ActivityType, Activity, AuditLogEvent, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType
} = require(`discord.js`);
const fs = require('fs');
const config = require('./config')

// Version Control //

const currentVersion = `${config.botVersion}`;

let client;
try {
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
const { handleLogs } = require("./events/CommandEvents/handleLogsEvent");
const Logs = require('discord-logs');
const { checkVersion } = require('./lib/version');

// Schemas //

const guildSettingsSchema = require('./schemas/prefixSystem');

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
const triggerFiles = fs.readdirSync("./src/triggers").filter(file => file.endsWith(".js"));
const eventFiles = fs.readdirSync("./src/events")
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


// Advanced Help Menu //

client.on(Events.InteractionCreate, async (interaction, err) => {

    const helprow2 = new ActionRowBuilder()
        .addComponents(

            new StringSelectMenuBuilder()
            .setMinValues(1)
            .setMaxValues(1)
            .setCustomId('selecthelp')
            .setPlaceholder('• Select a menu')
            .addOptions(
                {
                    label: '• Help Center',
                    description: 'Navigate to the Help Center.',
                    value: 'helpcenter',
                },

                {
                    label: '• How to add the bot',
                    description: `Displays how to add ${client.user.username} to your amazing server.`,
                    value: 'howtoaddbot'
                },

                {
                    label: '• Feedback',
                    description: `Displays how to contribute to the development of ${client.user.username} by giving feedback.`,
                    value: 'feedback'
                },

                {
                    label: '• Commands Help',
                    description: 'Navigate to the Commands help page.',
                    value: 'commands',
                },
                {
                    label: '• Prefix Commands Help',
                    description: 'Navigate to the Prefix Commands help page.',
                    value: 'pcommands',
                }
            ),
        );

    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId === 'selecthelp') {
        let choices = "";
        const fetchGuildPrefix = await guildSettingsSchema.findOne({ Guild: interaction.guild.id });
        const guildPrefix = fetchGuildPrefix.Prefix;

        const centerembed = new EmbedBuilder()
        .setColor(client.config.embedColor)
        .setTitle(`${client.user.username} Help Center ${client.config.arrowEmoji}`)
        .setAuthor({ name: `🚑 Help Command ${client.config.devBy}`})
        .setFooter({ text: `🚑 ${client.user.username}'s help center`})
        .setThumbnail(client.user.avatarURL())
        .addFields({ name: `• Commands Help`, value: `> Get all **Commands** (**${client.commands.size}** slash & **${client.pcommands.size}** prefix) ${client.user.username} looks over!`})
        .addFields({ name: `• What's my prefix?`, value: `> The prefix for **${interaction.guild.name}** is \`\`${guildPrefix}\`\``})
        .addFields({ name: "• How to add Bot", value: `> Quick guide on how to add our **${client.user.username}** \n> to your server.`})
        .addFields({ name: "• Feedback", value: "> How to send us feedback and suggestions."})
        .addFields({ name: "• Exclusive Functionality", value: `> Guide on how to receive permission to \n> use exclusive functionality (${client.user.username} Beta version).`})
        .setTimestamp();

        interaction.values.forEach(async (value) => {
            choices += `${value}`;

            if (value === 'helpcenter') {

                setTimeout(() => {
                    interaction.update({ embeds: [centerembed] }).catch(err);
                }, 100)

            }

            if (value === 'howtoaddbot') {

                setTimeout(() => {
                    const howtoaddembed = new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle(`${client.user.username} Help Center ${client.config.arrowEmoji}`)
                    .setDescription(`> **How to add ${client.user.username} to your server**`)
                    .setAuthor({ name: `🚑 Help Command ${client.config.devBy}`})
                    .setFooter({ text: `🚑 ${client.user.username}'s help center: Adding bot`})
                    .setThumbnail(client.user.avatarURL())
                    .addFields({ name: `• How to add ${client.user.username} to your server`, value: `> To add ${client.user.username} to your server, simple click on the bots profile and click, \`\`add app\`\`.` })
                    .addFields({ name: "• Wait.. what Official Discord server..", value: "> This is our Discord server: https://discord.gg/xcMVwAVjSD" })
                    .addFields({ name: "• Our official website..", value: "> This is our official website: https://testify.lol "})
                    .setTimestamp();

                    interaction.update({ embeds: [howtoaddembed] }).catch(err);
                }, 100)
            }

            if (value === 'feedback') {

                setTimeout(() => {
                    const feedbackembed = new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle(`${client.user.username} Help Center ${client.config.arrowEmoji}`)
                    .setDescription(`> **How to give feedback on ${client.user.username}**`)
                    .setAuthor({ name: `🚑 Help Command ${client.config.devBy}` })
                    .setFooter({ text: `🚑 ${client.user.username}'s help center: Sending feedback` })
                    .setThumbnail(client.user.avatarURL())
                    .addFields({ name: "• How can I give Feedback?", value: `> The creator of ${client.user.username} appreciates your opinion on our the bot. To send feedback or suggestions, use the command below. \n > Alternatively, if you spot or come across a bug, be sure to report it to us with the command below.` })
                    .addFields({ name: "• /suggestion", value: "> Opens up a suggestion form" })
                    .addFields({ name: "• /bug-report", value: "> Opens a bug report" })
                    .setTimestamp();

                    interaction.update({ embeds: [feedbackembed] }).catch(err);
                }, 100)
            }

            if (value === 'commands') {

                const commandpage1 = new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle(`${client.user.username} Help Center ${client.config.arrowEmoji}`)
                    .setAuthor({ name: `🚑 Help Command ${client.config.devBy}` })
                    .setFooter({ text: `🚑 ${client.user.username}'s help center: Commands Page 1` })
                    .setThumbnail(client.user.avatarURL())
                    .setDescription(`> **Commands Help Page \`\`1\`\`**`)
                    .addFields({ name: "• /account-view", value: "> View your economy account information." })
                    .addFields({ name: "• /add emoji", value: "> Adds an emoji to the server." })
                    .addFields({ name: "• /add sticker", value: "> Adds a sticker to the server." })
                    .addFields({ name: "• /advice", value: "> Gives you a random piece of advice." })
                    .addFields({ name: "• /animal-facts", value: "> Gives you a random animal fact." })
                    .addFields({ name: "• /announce", value: "> Announces a message in a specified channel." })
                    .addFields({ name: "• /ascii", value: "> Converts text to ascii." })
                    .addFields({ name: "• /automod flagged-words", value: "> Sets up the automod system for flagged words." })
                    .addFields({ name: "• /automod keyword", value: "> Sets up the automod system for keywords." })
                    .addFields({ name: "• /automod mention-spam", value: "> Sets up the automod system for mention-spam." })
                    .addFields({ name: "• /automod spam-messages", value: "> Sets up the automod system for spam-messages." })
                    .addFields({ name: "• /autorole-add", value: "> Adds a role to the autorole system." })
                    .addFields({ name: "• /autorole-disable", value: "> Disables the autorole system." })
                    .addFields({ name: "• /autorole-enable", value: "> Enables the autorole system." })
                    .addFields({ name: "• /autorole-remove", value: "> Removes a role from the autorole system." })
                    .addFields({ name: "• /avatar", value: "> Shows a users avatar." })
                    .addFields({ name: "• /ban", value: "> Bans a user for a specified reason." })
                    .addFields({ name: "• /beg", value: "> Beg for money. Results may vary." })
                    .addFields({ name: "• /bot-specs", value: "> Shows the bots specifications." })
                    .addFields({ name: "• /bot-uptime", value: "> Shows the bots current uptimes." })
                    .addFields({ name: "• /bug-report", value: "> Opens a bug report." })
                    .addFields({ name: "• /calculate", value: "> Calculates a math problem." })
                    .addFields({ name: "• /chat", value: "> Chat with an AI modal." })
                    .addFields({ name: "• /change-prefix", value: "> Changes the bots prefix in your server." })
                    .addFields({ name: "• /clear", value: "> Clears a specified amount of messages." })

                    .setImage('https://i.postimg.cc/8CbGp6D5/Screenshot-300.png')
                    .setTimestamp();

                const commandpage2 = new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle(`${client.user.username} Help Center ${client.config.arrowEmoji}`)
                    .setAuthor({ name: `🚑 Help Command ${client.config.devBy}` })
                    .setFooter({ text: `🚑 ${client.user.username}'s help center: Commands Page 2` })
                    .setThumbnail(client.user.avatarURL())
                    .setDescription(`> **Commands Help Page \`\`2\`\`**`)
                    .addFields({ name: "• /counting disable", value: "> Disables the counting system." })
                    .addFields({ name: "• /counting enable", value: "> Enables the counting system." })
                    .addFields({ name: "• /create embed", value: "> Creates an embed." })
                    .addFields({ name: "• /create thread", value: "> Creates a thread." })
                    .addFields({ name: "• /dad-joke", value: "> Tells a dad joke." })
                    .addFields({ name: "• /daily", value: "> Collect your daily reward." })
                    .addFields({ name: "• /deposit", value: "> Deposits a specified amount of balance to the bank." })
                    .addFields({ name: "• /dictionary", value: "> Searches the dictionary for a word." })
                    .addFields({ name: "• /economy-create account", value: "> Creates an economy account." })
                    .addFields({ name: "• /economy-delete account", value: "> Deletes an economy account." })
                    .addFields({ name: "• /fake-tweet", value: "> Creates a fake tweet." })
                    .addFields({ name: "• /fast-type", value: "> Starts a fast type game." })
                    .addFields({ name: "• /gamble", value: "> Gambles a specified amount of balance." })
                    .addFields({ name: "• /give currency", value: "> Gives a specified user a specified amount of currency." })
                    .addFields({ name: "• /give xp", value: "> Gives a specified user a specified amount of XP." })
                    .addFields({ name: "• /giveaway edit", value: "> edits the current giveaway." })
                    .addFields({ name: "• /giveaway end", value: "> Ends the current giveaway." })
                    .addFields({ name: "• /giveaway reroll", value: "> Rerolls the current giveaway." })
                    .addFields({ name: "• /giveaway start", value: "> Starts a giveaway." })
                    .addFields({ name: "• /guess the pokemon", value: "> Starts a game of guess the pokemon." })
                    .addFields({ name: "• /hack", value: "> Hacks a user (fake)." }) 
                    .addFields({ name: "• /help manual", value: "> Displays the help menu." })
                    .addFields({ name: "• /help server", value: "> Displays the help server." })
                    .addFields({ name: "• /how drunk", value: "> Displays how drunk you are." })
                    .addFields({ name: "• /how gay", value: "> Displays how gay you are." })

                    .setImage('https://i.postimg.cc/8CbGp6D5/Screenshot-300.png')
                    .setTimestamp();

                const commandpage3 = new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle(`${client.user.username} Help Center ${client.config.arrowEmoji}`)
                    .setAuthor({ name: `🚑 Help Command ${client.config.devBy}` })
                    .setFooter({ text: `🚑 ${client.user.username}'s help center: Commands Page 3` })
                    .setThumbnail(client.user.avatarURL())
                    .setDescription(`> **Commands Help Page \`\`3\`\`**`)
                    .addFields({ name: "• /how high", value: "> Displays how high you are." })
                    .addFields({ name: "• /how simp", value: "> Displays how much of a simp you are." })
                    .addFields({ name: "• /how stupid", value: "> Displays how stupid you are." })
                    .addFields({ name: "• /how sus", value: "> Displays how sus you are." })
                    .addFields({ name: "• /impersonate", value: "> Impersonates a user." })
                    .addFields({ name: "• /iq", value: "> Displays your IQ." })
                    .addFields({ name: "• /khalid-quote", value: "> Displays a random Khalid quote." })
                    .addFields({ name: "• /kick", value: "> Kicks a user for a specified reason." })
                    .addFields({ name: "• /latency", value: "> Displays the bots latency." })
                    .addFields({ name: "• /leaderboard", value: "> Displays the server leaderboard." })
                    .addFields({ name: "• /leveling-system disable", value: "> Disables leveling for the server." })
                    .addFields({ name: "• /leveling-system disable-multiplier", value: "> Disables the leveling multiplier." })
                    .addFields({ name: "• /leveling-system enable", value: "> Enables leveling for the server." })
                    .addFields({ name: "• /leveling-system role-multiplier", value: "> Sets up a leveling multiplier role." })
                    .addFields({ name: "• /lock", value: "> Locks a channel." })
                    .addFields({ name: "• /logs-disable", value: "> Disables the logs." })
                    .addFields({ name: "• /logs-setup", value: "> Enables the logs." })
                    .addFields({ name: "• /lyrics", value: "> Displays the lyrics of a song." })
                    .addFields({ name: "• /master-oogway", value: "> Generate a quote from master oogway." })
                    .addFields({ name: "• /member-count", value: "> Displays the server member count." })
                    .addFields({ name: "• /members-vc bot-remove", value: "> Disables the total bots voice channel." })
                    .addFields({ name: "• /members-vc bot-set", value: "> Sets up the total bots voice channel." })
                    .addFields({ name: "• /members-vc total-remove", value: "> Disables the total members voice channel." })
                    .addFields({ name: "• /members-vc total-set", value: "> Sets up the total members voice channel." })
                    .addFields({ name: "• /meme", value: "> Displays a random meme." })

                    .setImage('https://i.postimg.cc/8CbGp6D5/Screenshot-300.png')
                    .setTimestamp();

                const commandpage4 = new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle(`${client.user.username} Help Center ${client.config.arrowEmoji}`)
                    .setAuthor({ name: `🚑 Help Command ${client.config.devBy}` })
                    .setFooter({ text: `🚑 ${client.user.username}'s help center: Commands Page 4` })
                    .setThumbnail(client.user.avatarURL())
                    .setDescription(`> **Commands Help Page \`\`4\`\`**`)
                    .addFields({ name: "• /minecraft-server", value: "> Displays information about a minecraft server." })
                    .addFields({ name: "• /minecraft-skin", value: "> Displays the skin of a minecraft user." })
                    .addFields({ name: "• /minigame 2048", value: "> Starts a game of 2048." })
                    .addFields({ name: "• /minigame connect4", value: "> Starts a game of connect4." })
                    .addFields({ name: "• /minigame find-emoji", value: "> Starts a game of find-emoji." })
                    .addFields({ name: "• /minigame flood", value: "> Starts a game of flood-it." })
                    .addFields({ name: "• /minigame hangman", value: "> Starts a game of hangman." })
                    .addFields({ name: "• /minigame match-pairs", value: "> Starts a game of match-pairs." })
                    .addFields({ name: "• /minigame minesweeper", value: "> Starts a game of minesweeper." })
                    .addFields({ name: "• /minigame rps", value: "> Starts a game of rock-paper-scissors." })
                    .addFields({ name: "• /minigame slots", value: "> Starts a game of slots." })
                    .addFields({ name: "• /minigame snake", value: "> Starts a game of snake." })
                    .addFields({ name: "• /minigame tictactoe", value: "> Starts a game of tictactoe." })
                    .addFields({ name: "• /minigame wordle", value: "> Starts a game of wordle." })
                    .addFields({ name: "• /minigame would-you-rather", value: "> Starts a game of would you rather." })
                    .addFields({ name: "• /mod-panel", value: "> Opens the moderation panel." })
                    .addFields({ name: "• /movie-tracker", value: "> Displays info about a given movie" })
                    .addFields({ name: "• /mute", value: "> Mutes a user for a specified reason." })
                    .addFields({ name: "• /nick", value: "> Changes a users nickname." })
                    .addFields({ name: "• /nitro", value: "> Generates a nitro code. (fake)" })
                    .addFields({ name: "• /pepe-sign", value: "> Generates a pepe sign." })
                    .addFields({ name: "• /permissions", value: "> Displays a users permissions." })
                    .addFields({ name: "• /ping", value: "> Displays the bots ping." })
                    .addFields({ name: "• /pp-size", value: "> Displays your pp size." })

                    .setImage('https://i.postimg.cc/8CbGp6D5/Screenshot-300.png')
                    .setTimestamp();

                const commandpage5 = new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle(`${client.user.username} Help Center ${client.config.arrowEmoji}`)
                    .setAuthor({ name: `🚑 Help Command ${client.config.devBy}` })
                    .setFooter({ text: `🚑 ${client.user.username}'s help center: Commands Page 5` })
                    .setThumbnail(client.user.avatarURL())
                    .setDescription(`> **Commands Help Page \`\`5\`\`**`)
                    .addFields({ name: "• /profile-create", value: "> Creates a users profile." })
                    .addFields({ name: "• /profile-edit", value: "> Edits a users profile." })
                    .addFields({ name: "• /profile-view", value: "> Views a users profile." })
                    .addFields({ name: "• /radio", value: "> Plays a radio station in a voice channel." })
                    .addFields({ name: "• /rank", value: "> Displays a users rank." })
                    .addFields({ name: "• /relationship-checker", value: "> Displays a users relationship status with another user." })
                    .addFields({ name: "• /reset all-currency", value: "> Resets all economy currency for the server." })
                    .addFields({ name: "• /reset all-xp", value: "> Resets all economy XP for the server." })
                    .addFields({ name: "• /reset currency", value: "> Resets a users economy currency." })
                    .addFields({ name: "• /reset xp", value: "> Resets a users economy XP." })
                    .addFields({ name: "• /rob", value: "> Robs a user for a specified amount." })
                    .addFields({ name: "• /role-add", value: "> Adds a role to a user." })
                    .addFields({ name: "• /role-remove", value: "> Removes a role from a user." })
                    .addFields({ name: "• /role-info", value: "> Displays information about a role." })
                    .addFields({ name: "• /say", value: "> Makes the bot say a message." })
                    .addFields({ name: "• /server-info", value: "> Displays information about the server." })
                    .addFields({ name: "• /slow-mode-check", value: "> Checks the slowmode of a channel." })
                    .addFields({ name: "• /slow-mode-off", value: "> Disables the slowmode of a channel." })
                    .addFields({ name: "• /slow-mode-set", value: "> Sets the slowmode of a channel." })
                    .addFields({ name: "• /soundboard", value: "> Plays a sound in a voice channel." })
                    .addFields({ name: "• /spotify", value: "> Displays information about a spotify track the users listing to." })
                    .addFields({ name: "• /sticky-message-check", value: "> Displays active sticky message(s)." })
                    .addFields({ name: "• /sticky-message-disable", value: "> Disables the sticky message system." })
                    .addFields({ name: "• /sticky-message-enable", value: "> Enables the sticky message system." })
                    .addFields({ name: "• /suggest", value: "> Suggests a feature for the bot." })
                    
                    .setImage('https://i.postimg.cc/8CbGp6D5/Screenshot-300.png')
                    .setTimestamp();

                const commandpage6 = new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle(`${client.user.username} Help Center ${client.config.arrowEmoji}`)
                    .setAuthor({ name: `🚑 Help Command ${client.config.devBy}` })
                    .setFooter({ text: `🚑 ${client.user.username}'s help center: Commands Page 6` })
                    .setThumbnail(client.user.avatarURL())
                    .setDescription(`> **Commands Help Page \`\`6\`\`**`)
                    .addFields({ name: "• /test", value: "> Tests the bot." })
                    .addFields({ name: "• /translate", value: "> Translates a message." })
                    .addFields({ name: "• /tts", value: "> Text to speech." })
                    .addFields({ name: "• /unban", value: "> Unbans a user." })
                    .addFields({ name: "• /unlock", value: "> Unlocks a channel." })
                    .addFields({ name: "• /unmute", value: "> Unmutes a user." })
                    .addFields({ name: "• /user-info", value: "> Displays information about a user." })
                    .addFields({ name: "• /verify-disable", value: "> Disables the verification system." })
                    .addFields({ name: "• /verify-setup", value: "> Enables the verification system." })
                    .addFields({ name: "• /warn clear", value: "> Warns a user." })
                    .addFields({ name: "• /warn create", value: "> Creates a warning." })
                    .addFields({ name: "• /warn edit", value: "> Edits a warning." })
                    .addFields({ name: "• /warn info", value: "> Displays information about a warning." })
                    .addFields({ name: "• /warn list", value: "> Lists all warnings." })
                    .addFields({ name: "• /warn remove", value: "> Removes a warning." })
                    .addFields({ name: "• /welcome-system remove", value: "> Disables the welcome system." })
                    .addFields({ name: "• /welcome-system set", value: "> Enables the welcome system." })
                    .addFields({ name: "• /wiki", value: "> Searches wikipedia for a query." })
                    .addFields({ name: "• /wipe-user-data", value: "> Wipes a users data." })
                    .addFields({ name: "• /withdraw", value: "> Withdraws a specified amount of balance from the bank." })
                    .addFields({ name: "• /work", value: "> Work for money." })

                    .setImage('https://i.postimg.cc/8CbGp6D5/Screenshot-300.png')
                    .setTimestamp();

                const commandpage7 = new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle(`${client.user.username} Help Center ${client.config.arrowEmoji}`)
                    .setAuthor({ name: `🚑 Help Command ${client.config.devBy}` })
                    .setFooter({ text: `🚑 ${client.user.username}'s help center: Commands Page 7` })
                    .setThumbnail(client.user.avatarURL())
                    .setDescription(`> **Commands Help Page \`\`7\`\`**`)
                    .addFields({ name: '• /prefix change', value: '> Changes the bots prefix.'})
                    .addFields({ name: '• /prefix reset', value: '> Resets the bots prefix.'})
                    .addFields({ name: '• /prefix check', value: '> Checks the bots prefix.'})

                    .setImage('https://i.postimg.cc/8CbGp6D5/Screenshot-300.png')
                    .setTimestamp(); 

                const commandbuttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('helpcenterbutton')
                            .setLabel('Help Center')
                            .setStyle(ButtonStyle.Success),

                            new ButtonBuilder()
                            .setCustomId('first')
                            .setLabel('◀◀')
                            .setDisabled(true)
                            .setStyle(ButtonStyle.Primary),

                        new ButtonBuilder()
                            .setCustomId('pageleft')
                            .setLabel('◀')
                            .setDisabled(true)
                            .setStyle(ButtonStyle.Secondary),

                        new ButtonBuilder()
                            .setCustomId('pageright')
                            .setLabel('▶')
                            .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                            .setCustomId('last')
                            .setLabel('▶▶')
                            .setStyle(ButtonStyle.Primary)
                    );

                const commandbuttons1 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('helpcenterbutton1')
                            .setLabel('Help Center')
                            .setStyle(ButtonStyle.Success),

                            new ButtonBuilder()
                            .setCustomId('first')
                            .setLabel('◀◀')
                            .setStyle(ButtonStyle.Primary),

                        new ButtonBuilder()
                            .setCustomId('pageleft1')
                            .setLabel('◀')
                            .setDisabled(false)
                            .setStyle(ButtonStyle.Secondary),

                        new ButtonBuilder()
                            .setCustomId('pageright1')
                            .setDisabled(false)
                            .setLabel('▶')
                            .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                            .setCustomId('last')
                            .setLabel('▶▶')
                            .setStyle(ButtonStyle.Primary)
                        );

                    const commandbuttons2 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('helpcenterbutton2')
                            .setLabel('Help Center')
                            .setStyle(ButtonStyle.Success),

                            new ButtonBuilder()
                            .setCustomId('first')
                            .setLabel('◀◀')
                            .setStyle(ButtonStyle.Primary),

                        new ButtonBuilder()
                            .setCustomId('pageleft2')
                            .setLabel('◀')
                            .setDisabled(false)
                            .setStyle(ButtonStyle.Secondary),

                        new ButtonBuilder()
                            .setCustomId('pageright2')
                            .setDisabled(false)
                            .setLabel('▶')
                            .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                            .setCustomId('last')
                            .setLabel('▶▶')
                            .setStyle(ButtonStyle.Primary)
                    );

                const commandbuttons3 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('helpcenterbutton3')
                            .setLabel('Help Center')
                            .setStyle(ButtonStyle.Success),

                            new ButtonBuilder()
                            .setCustomId('first')
                            .setLabel('◀◀')
                            .setStyle(ButtonStyle.Primary),

                        new ButtonBuilder()
                            .setCustomId('pageleft3')
                            .setLabel('◀')
                            .setDisabled(false)
                            .setStyle(ButtonStyle.Secondary),

                        new ButtonBuilder()
                            .setCustomId('pageright3')
                            .setDisabled(false)
                            .setLabel('▶')
                            .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                            .setCustomId('last')
                            .setLabel('▶▶')
                            .setStyle(ButtonStyle.Primary)
                    );

                const commandbuttons4 = new ActionRowBuilder()
                    .addComponents(

                        new ButtonBuilder()
                            .setCustomId('helpcenterbutton4')
                            .setLabel('Help Center')   
                            .setStyle(ButtonStyle.Success),

                            new ButtonBuilder()
                            .setCustomId('first')
                            .setLabel('◀◀')
                            .setStyle(ButtonStyle.Primary),

                        new ButtonBuilder()
                            .setCustomId('pageleft4')
                            .setLabel('◀')
                            .setDisabled(false)
                            .setStyle(ButtonStyle.Secondary),

                        new ButtonBuilder()
                            .setCustomId('pageright4')
                            .setDisabled(false)
                            .setLabel('▶')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('last')
                            .setLabel('▶▶')
                            .setDisabled(true)
                            .setStyle(ButtonStyle.Primary)
                            
                    );
                
                    const commandbuttons5 = new ActionRowBuilder()
                    .addComponents(

                        new ButtonBuilder()
                            .setCustomId('helpcenterbutton5')
                            .setLabel('Help Center')   
                            .setStyle(ButtonStyle.Success),

                            new ButtonBuilder()
                            .setCustomId('first')
                            .setLabel('◀◀')
                            .setStyle(ButtonStyle.Primary),

                        new ButtonBuilder()
                            .setCustomId('pageleft5')
                            .setLabel('◀')
                            .setDisabled(false)
                            .setStyle(ButtonStyle.Secondary),

                        new ButtonBuilder()
                            .setCustomId('pageright5')
                            .setDisabled(false)
                            .setLabel('▶')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('last')
                            .setLabel('▶▶')
                            .setDisabled(false)
                            .setStyle(ButtonStyle.Primary)
                            
                    );

                    const commandbuttons6 = new ActionRowBuilder()
                    .addComponents(

                        new ButtonBuilder()
                            .setCustomId('helpcenterbutton6')
                            .setLabel('Help Center')   
                            .setStyle(ButtonStyle.Success),

                            new ButtonBuilder()
                            .setCustomId('first')
                            .setLabel('◀◀')
                            .setStyle(ButtonStyle.Primary),

                        new ButtonBuilder()
                            .setCustomId('pageleft6')
                            .setLabel('◀')
                            .setDisabled(false)
                            .setStyle(ButtonStyle.Secondary),

                        new ButtonBuilder()
                            .setCustomId('pageright6')
                            .setDisabled(true)
                            .setLabel('▶')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('last')
                            .setLabel('▶▶')
                            .setDisabled(true)
                            .setStyle(ButtonStyle.Primary)
                            
                    );


                await interaction.update({ embeds: [commandpage1], components: [commandbuttons] }).catch(err);
                const collector = interaction.message.createMessageComponentCollector({ componentType: ComponentType.Button });

                collector.on('collect', async (i, err) => {

                    if (i.customId === 'last') {
                        i.update({ embeds: [commandpage7], components: [commandbuttons6] }).catch(err);
                    } 

                    if (i.customId === 'first') {
                        i.update({ embeds: [commandpage1], components: [commandbuttons] }).catch(err);
                    }

                    if (i.customId === 'helpcenterbutton') {
                        i.update({ embeds: [centerembed], components: [helprow2] }).catch(err);
                    }

                    if (i.customId === 'pageleft') { 
                        i.update({ embeds: [commandpage1], components: [commandbuttons] }).catch(err);
                    }

                    if (i.customId === 'pageright') { 
                        i.update({ embeds: [commandpage2], components: [commandbuttons1] }).catch(err);
                    }

                    if (i.customId === 'helpcenterbutton1') {
                        i.update({ embeds: [centerembed], components: [helprow2] }).catch(err);
                    }

                    if (i.customId === 'pageright1') {
                        i.update({ embeds: [commandpage3], components: [commandbuttons2] }).catch(err);
                    }

                    if (i.customId === 'pageleft1') {
                        i.update({ embeds: [commandpage1], components: [commandbuttons] }).catch(err);
                    }

                    if (i.customId === 'helpcenterbutton2') {
                        i.update({ embeds: [centerembed], components: [helprow2] }).catch(err);
                    }

                    if (i.customId === 'pageright2') {
                        i.update({ embeds: [commandpage4], components: [commandbuttons3] }).catch(err);
                    }

                    if (i.customId === 'pageleft2') {
                        i.update({ embeds: [commandpage2], components: [commandbuttons1] }).catch(err);
                    }

                    if (i.customId === 'helpcenterbutton3') {
                        i.update({ embeds: [centerembed], components: [helprow2] }).catch(err)
                    }

                    if (i.customId === 'pageright3') {
                        i.update({ embeds: [commandpage5], components: [commandbuttons4] }).catch(err);
                    }

                    if (i.customId === 'pageleft3') {
                        i.update({ embeds: [commandpage3], components: [commandbuttons2] }).catch(err);
                    }

                    if (i.customId === 'helpcenterbutton4') {
                        i.update({ embeds: [centerembed], components: [helprow2] }).catch(err);
                    }

                    if (i.customId === 'pageright4') {
                        i.update({ embeds: [commandpage6], components: [commandbuttons5] }).catch(err);
                    } 

                    if (i.customId === 'pageleft4') {
                        i.update({ embeds: [commandpage4], components: [commandbuttons3] }).catch(err);
                    }

                    if (i.customId === 'helpcenterbutton5') {
                        i.update({ embeds: [centerembed], components: [helprow2] }).catch(err);
                    }

                    if (i.customId === 'pageright5') {
                        i.update({ embeds: [commandpage7], components: [commandbuttons6] }).catch(err);
                    } 

                    if (i.customId === 'pageleft5') {
                        i.update({ embeds: [commandpage5], components: [commandbuttons4] }).catch(err);
                    }

                    if (i.customId === 'helpcenterbutton6') {
                        i.update({ embeds: [centerembed], components: [helprow2] }).catch(err);
                    }

                    if (i.customId === 'pageright6') {
                        i.update({ embeds: [commandpage7], components: [commandbuttons6] }).catch(err);
                    } 

                    if (i.customId === 'pageleft6') {
                        i.update({ embeds: [commandpage6], components: [commandbuttons5] }).catch(err);
                    } 
                });
            }

            if (value === 'pcommands') {

                const fetchGuildPrefix = await guildSettingsSchema.findOne({ Guild: interaction.guild.id });
                const guildPrefix = fetchGuildPrefix.Prefix;

                const pcommandpage = new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle(`${client.user.username} Help Center ${client.config.arrowEmoji}`)
                    .setAuthor({ name: `🚑 Help Command ${client.config.devBy}` })
                    .setFooter({ text: `🚑 ${client.user.username}'s help center: Prefix Commands Page 1` })
                    .setThumbnail(client.user.avatarURL())
                    .setDescription(`> **Prefix Commands Help Page \`\`1\`\`**`)
                    .addFields({ name: `• ${guildPrefix}animalfacts`, value: `> Gives you a random animal fact.` })
                    .addFields({ name: `• ${guildPrefix}meme`, value: `> Displays a random meme.` })
                    .addFields({ name: `• ${guildPrefix}beg`, value: `> Beg for money. Results may vary.` })
                    .addFields({ name: `• ${guildPrefix}daily`, value: `> Collect your daily reward.` })
                    .addFields({ name: `• ${guildPrefix}work`, value: `> Work for money.` })
                    .addFields({ name: `• ${guildPrefix}account`, value: `> View your economy account information.` })
                    .addFields({ name: `• ${guildPrefix}cprefix`, value: `> Changes the bots prefix.` })
                    .addFields({ name: `• ${guildPrefix}dad-joke`, value: `> Tells a dad joke.` })
                    .addFields({ name: `• ${guildPrefix}iq`, value: `> Displays your IQ.` })
                    .addFields({ name: `• ${guildPrefix}nitro`, value: `> Generates a nitro code. (fake)` })
                    .addFields({ name: `• ${guildPrefix}rc`, value: `> Displays a relationship checker.` })
                    .addFields({ name: `• ${guildPrefix}ban`, value: `> Bans a user` })
                    .addFields({ name: `• ${guildPrefix}kick`, value: `> Kicks a user` })
                    .addFields({ name: `• ${guildPrefix}unban`, value: `> Unbans a user` })
                    .addFields({ name: `• ${guildPrefix}pfp`, value: `> Displays a users profile picture` })
                    .addFields({ name: `• ${guildPrefix}bot-specs`, value: `> Shows the bots specifications.` })
                    .addFields({ name: `• ${guildPrefix}bot-info`, value: `> Shows the bots information.` })
                    .addFields({ name: `• ${guildPrefix}member-graph`, value: `> Displays the server member graph.` })
                    .addFields({ name: `• ${guildPrefix}perms`, value: `> Displays a users permissions.` })
                    .addFields({ name: `• ${guildPrefix}serverinfo`, value: `> Displays the server information.` })
                    .addFields({ name: `• ${guildPrefix}userinfo`, value: `> Displays a users information.` })
                    .addFields({ name: `• ${guildPrefix}roleinfo`, value: `> Displays a roles information.` })
                    .addFields({ name: `• ${guildPrefix}uptime`, value: `> Shows the bots uptime.` })
                    .addFields({ name: `• ${guildPrefix}lb`, value: `> Displays the server leaderboard.` })
                    .addFields({ name: `• ${guildPrefix}rank`, value: `> Displays a users rank.` })

                    .setImage('https://i.postimg.cc/TPTDJZt7/Screenshot-2024-06-22-211847.png')
                    .setTimestamp();

                const pcommandpage1 = new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle(`${client.user.username} Help Center ${client.config.arrowEmoji}`)
                    .setAuthor({ name: `🚑 Help Command ${client.config.devBy}` })
                    .setFooter({ text: `🚑 ${client.user.username}'s help center: Prefix Commands Page 2` })
                    .setThumbnail(client.user.avatarURL())
                    .setDescription(`> **Prefix Commands Help Page \`\`2\`\`**`)
                    .addFields({ name: `• ${guildPrefix}addrole`, value: `> Adds a role to a user.` })
                    .addFields({ name: `• ${guildPrefix}removerole`, value: `> Removes a role from a user.` })
                    .addFields({ name: `• ${guildPrefix}nick`, value: `> Changes a users nickname.` })
                    .addFields({ name: `• ${guildPrefix}clear`, value: `> Clears a specified amount of messages.` })
                    .addFields({ name: `• ${guildPrefix}autoplay`, value: `> Toggles autoplay for the music system.` })
                    .addFields({ name: `• ${guildPrefix}filter`, value: `> Toggles the music filter.` })
                    .addFields({ name: `• ${guildPrefix}forward`, value: `> Forwards the music.` })
                    .addFields({ name: `• ${guildPrefix}join`, value: `> Makes the bot join a voice channel.` })
                    .addFields({ name: `• ${guildPrefix}leave`, value: `> Makes the bot leave a voice channel.` })
                    .addFields({ name: `• ${guildPrefix}np`, value: `> Shows the currently playing song.` })
                    .addFields({ name: `• ${guildPrefix}pause`, value: `> Pauses the music.` })
                    .addFields({ name: `• ${guildPrefix}play`, value: `> Plays a song.` })
                    .addFields({ name: `• ${guildPrefix}playskip`, value: `> Plays a song and skips the current song.` })
                    .addFields({ name: `• ${guildPrefix}playtop`, value: `> Plays the top song in queue.` })
                    .addFields({ name: `• ${guildPrefix}previous`, value: `> Plays the previous song.` })
                    .addFields({ name: `• ${guildPrefix}queue`, value: `> Shows the music queue.` })
                    .addFields({ name: `• ${guildPrefix}repeat`, value: `> Toggles repeat for the music system.` })
                    .addFields({ name: `• ${guildPrefix}resume`, value: `> Resumes the music.` })
                    .addFields({ name: `• ${guildPrefix}rewind`, value: `> Rewinds the music.` })
                    .addFields({ name: `• ${guildPrefix}seek`, value: `> Seeks the music.` })
                    .addFields({ name: `• ${guildPrefix}shuffle`, value: `> Shuffles the music queue.` })
                    .addFields({ name: `• ${guildPrefix}skip`, value: `> Skips the current song.` })
                    .addFields({ name: `• ${guildPrefix}skipto`, value: `> Skips to a specified song.` })
                    .addFields({ name: `• ${guildPrefix}stop`, value: `> Stops the music.` })
                    .addFields({ name: `• ${guildPrefix}volume`, value: `> Changes the music volume.` })

                    .setImage('https://i.postimg.cc/TPTDJZt7/Screenshot-2024-06-22-211847.png')
                    .setTimestamp();

                const pcommandbuttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('pcommand-helpcenterbutton')
                            .setLabel('Help Center')
                            .setStyle(ButtonStyle.Success),

                            new ButtonBuilder()
                            .setCustomId('pcommand-first')
                            .setLabel('◀◀')
                            .setDisabled(true)
                            .setStyle(ButtonStyle.Primary),

                        new ButtonBuilder()
                            .setCustomId('pcommand-pageleft')
                            .setLabel('◀')
                            .setDisabled(true)
                            .setStyle(ButtonStyle.Secondary),

                        new ButtonBuilder()
                            .setCustomId('pcommand-pageright')
                            .setLabel('▶')
                            .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                            .setCustomId('pcommand-last')
                            .setLabel('▶▶')
                            .setStyle(ButtonStyle.Primary)
                    );

                const pcommandbuttons1 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('pcommand-helpcenterbutton1')
                            .setLabel('Help Center')
                            .setStyle(ButtonStyle.Success),

                            new ButtonBuilder()
                            .setCustomId('pcommand-first')
                            .setLabel('◀◀')
                            .setStyle(ButtonStyle.Primary),

                        new ButtonBuilder()
                            .setCustomId('pcommand-pageleft1')
                            .setLabel('◀')
                            .setDisabled(false)
                            .setStyle(ButtonStyle.Secondary),

                        new ButtonBuilder()
                            .setCustomId('pcommand-pageright1')
                            .setDisabled(false)
                            .setLabel('▶')
                            .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                            .setCustomId('pcommand-last')
                            .setLabel('▶▶')
                            .setStyle(ButtonStyle.Primary)
                        );
                    
                await interaction.update({ embeds: [pcommandpage], components: [pcommandbuttons] }).catch(err);
                const collector = interaction.message.createMessageComponentCollector({ componentType: ComponentType.Button });

                collector.on('collect', async (i, err) => {
                    try {

                        await i.deferUpdate();

                        if (i.customId === 'pcommand-last') {
                            i.editReply({ embeds: [pcommandpage1], components: [pcommandbuttons1] }).catch(err);
                        } 

                        if (i.customId === 'pcommand-first') {
                            i.editReply({ embeds: [pcommandpage], components: [pcommandbuttons] }).catch(err);
                        }

                        if (i.customId === 'pcommand-helpcenterbutton') {
                            i.editReply({ embeds: [centerembed], components: [helprow2] }).catch(err);
                        }

                        if (i.customId === 'pcommand-pageleft') { 
                            i.editReply({ embeds: [pcommandpage], components: [pcommandbuttons] }).catch(err);
                        }

                        if (i.customId === 'pcommand-pageright') { 
                            i.editReply({ embeds: [pcommandpage1], components: [pcommandbuttons1] }).catch(err);
                        }

                        if (i.customId === 'pcommand-helpcenterbutton1') {
                            i.editReply({ embeds: [centerembed], components: [helprow2] }).catch(err);
                        }

                        if (i.customId === 'pcommand-pageright1') {
                            i.editReply({ embeds: [pcommandpage1], components: [pcommandbuttons1] }).catch(err);
                        }

                        if (i.customId === 'pcommand-pageleft1') {
                            i.editReply({ embeds: [pcommandpage], components: [pcommandbuttons] }).catch(err);
                        }
                    } catch(err) {
                        console.log(`${color.red}[${getTimestamp()}]${color.reset} [PREFIX_HELP_MENU] There was an error in the buttons on prefix command help center`, err);
                    }
                });
            }
        })
    }
})

const Prefix = require('./schemas/prefixSystem'); 

client.on('guildCreate', async guild => {
    const newPrefix = new Prefix({
        Guild: guild.id,
        Prefix: Prefix.schema.path('Prefix').defaultValue, 
    });
    newPrefix.save();
});