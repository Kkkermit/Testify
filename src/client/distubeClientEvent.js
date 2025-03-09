const { DisTube } = require("distube");
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { EmbedBuilder } = require('discord.js');
const { color, getTimestamp } = require('../utils/loggingEffects');
const updateYTDLPackages = require('../scripts/ytdlUpdater');

function distubeClient(client, distube) {
    console.log(`${color.yellow}[${getTimestamp()}]${color.reset} [MUSIC] Initializing DisTube client...`);
    
    try {
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
        console.log(`${color.green}[${getTimestamp()}]${color.reset} [MUSIC] DisTube client initialized successfully`);

        const status = queue =>
            `Volume: \`${queue.volume}%\` | Filter: \`${queue.filters.names.join(', ') || 'Off'}\` | Loop: \`${queue.repeatMode ? (queue.repeatMode === 2 ? 'All Queue' : 'This Song') : 'Off'
            }\` | Autoplay: \`${queue.autoplay ? 'On' : 'Off'}\``
            
        client.distube
            .on('playSong', (queue, song) => {
                queue.textChannel.send({
                    embeds: [new EmbedBuilder().setColor(client.config.embedMusic)
                        .setDescription(`🎶 | Playing \`${song.name}\` - \`${song.formattedDuration}\`\nRequested by: ${song.user
                            }\n${status(queue)}`)]
                });
            })
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
                console.error(`${color.red}[${getTimestamp()}] [MUSIC_ERROR] ${e}${color.reset}`);

                if (e.toString().includes('ytdl-core') || e.toString().includes('ytsr')) {
                    console.log(`${color.yellow}[${getTimestamp()}] [MUSIC] Attempting to update packages due to error${color.reset}`);
                    updateYTDLPackages();
                }
                
                if (channel) channel.send(`⛔ | An error encountered: ${e.toString().slice(0, 1974)}`);
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
    } catch (error) {
        console.error(`${color.red}[${getTimestamp()}] [MUSIC] Failed to initialize DisTube: ${error}${color.reset}`);
        console.log(`${color.yellow}[${getTimestamp()}] [MUSIC] Attempting to update packages and retry${color.reset}`);
        updateYTDLPackages();
    }
}

module.exports = distubeClient;