const { DisTube } = require("distube");
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { EmbedBuilder } = require('discord.js');

function distubeClient(client, distube) {
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
        .on('finish', queue => queue.textChannel.send({
            embeds: [new EmbedBuilder().setColor(client.config.embedMusic)
                .setDescription('🏁 | Queue finished!')]
        }))
}

module.exports = distubeClient;