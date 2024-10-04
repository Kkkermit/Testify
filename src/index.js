
// ████████╗███████╗███████╗████████╗██╗███████╗██╗   ██╗
// ╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝██║██╔════╝╚██╗ ██╔╝
//    ██║   █████╗  ███████╗   ██║   ██║█████╗   ╚████╔╝ 
//    ██║   ██╔══╝  ╚════██║   ██║   ██║██╔══╝    ╚██╔╝  
//    ██║   ███████╗███████║   ██║   ██║██║        ██║   
//    ╚═╝   ╚══════╝╚══════╝   ╚═╝   ╚═╝╚═╝        ╚═╝   

// Developed by: Kkermit. All rights reserved. (2024)
// MIT License

const { Client, GatewayIntentBits, EmbedBuilder, Collection, Partials } = require(`discord.js`);
const fs = require('fs');
const config = require('./config')

// Client Loader //

const loadEnvironment = require('./scripts/bootMode');
loadEnvironment();

// Version Control //

const currentVersion = `${config.botVersion}`;

// Logging Effects //

const { getTimestamp, color } = require('./utils/loggingEffects.js');

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
    .on('finish', queue => {
        queue.textChannel.send({
            embeds: [new EmbedBuilder().setColor(client.config.embedMusic)
                .setDescription('🏁 | Fila terminada! Mensagem será apagada em 5 segundos.')]
        }).then(async message => {
            try {
                // Aguarda 5 segundos antes de apagar a mensagem
                for (let i = 5; i > 0; i--) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await message.edit({
                        embeds: [new EmbedBuilder().setColor(client.config.embedMusic)
                            .setDescription(`🏁 | Fila terminada! Mensagem será apagada em ${i} segundos.`)]
                    });
                }

                // Apaga a mensagem de fila terminada
                await message.delete();

                // Apaga as últimas 10 mensagens do canal (incluindo comandos e mensagens do bot)
                await queue.textChannel.bulkDelete(10);
            } catch (error) {
                console.error('Erro ao editar ou excluir mensagens:', error);
            }
        });

        // Apaga o último comando usado (assumindo que está armazenado em algum lugar)
        if (queue.lastCommand) {
            queue.lastCommand.delete().catch(console.error);
        }
    })
    .on('initQueue', queue => {
        // Apaga as últimas 10 mensagens do canal quando uma nova fila é iniciada
        queue.textChannel.bulkDelete(10).catch(console.error);
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
