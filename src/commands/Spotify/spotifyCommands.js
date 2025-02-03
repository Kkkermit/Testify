require('dotenv').config({ path: '../../../.env'});

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getTopItems } = require('../../api/spotifyTrackerApi');
const { createStatsEmbed } = require('../../utils/createStatsEmbed');
const User = require('../../schemas/spotifyTrackerSystem');
const canvacord = require('canvacord');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('spotify')
        .setDescription('spotify commands')
        .addSubcommand(command => command.setName('login').setDescription('Connect your Spotify account'))
        .addSubcommand(command => command.setName('stats').setDescription('View your Spotify stats').addUserOption(option => option.setName('user').setDescription('The user to get stats for').setRequired(false)))
        .addSubcommand(command => command.setName('currently-playing').setDescription('View what you are currently playing').addUserOption(option => option.setName('user').setDescription('The user to get stats for').setRequired(false))),

    async execute(interaction, client) {

        const sub = interaction.options.getSubcommand();

        switch(sub) {
            case 'login':

            const state = interaction.user.id;
            const scopes = ['user-top-read', 'user-read-recently-played'];
            
            const authUrl = `https://accounts.spotify.com/authorize?client_id=${process.env.SPOTIFY_CLIENT_ID}` +
                `&response_type=code` +
                `&redirect_uri=${encodeURIComponent(process.env.SPOTIFY_REDIRECT_URI)}` +
                `&scope=${encodeURIComponent(scopes.join(' '))}` +
                `&state=${state}`;

            const loginEmbed = new EmbedBuilder()
            .setAuthor({ name: `Spotify Login ${client.config.devBy}`})
            .setTitle(`Connect your Spotify Account ${client.config.arrowEmoji}`)
            .setDescription(`Click the link below to connect your Spotify account to view your stats!`)
            .setURL(authUrl)
            .setFooter({ text: `Spotify Login` })
            .setTimestamp()
            .setColor(client.config.embedSpotify)

            const loginButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Connect Spotify')
                        .setURL(authUrl)
                        .setStyle(ButtonStyle.Link)
                        .setEmoji('🎵')
                );

            await interaction.reply({
                embeds: [loginEmbed],
                components: [loginButton],
                ephemeral: true
            });

            break;
            case 'stats':

            try {
                const targetUser = interaction.options.getUser('user') || interaction.user;
                const user = await User.findOne({ discordId: targetUser.id });
                
                if (!user || !user.spotifyAccessToken) {
                    return interaction.reply({
                        content: targetUser.id === interaction.user.id ? 
                            'Please connect your Spotify account first!' : 
                            'This user hasn\'t connected their Spotify account!',
                        ephemeral: true
                    });
                }
    
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`spotify-tracks-${targetUser.id}`)
                            .setLabel('Top Tracks')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId(`spotify-artists-${targetUser.id}`)
                            .setLabel('Top Artists')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId(`spotify-albums-${targetUser.id}`)
                            .setLabel('Top Albums')
                            .setStyle(ButtonStyle.Primary)
                    );
    
                const tracks = await getTopItems(user.spotifyAccessToken, 'tracks');
                const initialEmbed = createStatsEmbed(tracks, 'tracks', targetUser);
    
                await interaction.reply({
                    embeds: [initialEmbed],
                    components: [row]
                });
            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: 'Error fetching Spotify stats!',
                    ephemeral: true
                });
            }

            break;
            case 'currently-playing':

            let user = interaction.options.getMember('user');
                    
            if (user.bot) return await interaction.reply({ content: `Invalid command. Cannot obtain a bots spotify status.`, ephemeral: true });
            
            let status;
            if (user.presence.activities.length === 1) status = user.presence.activities[0];
            else if (user.presence.activities.length > 1)status =user.presence.activities[1];
    
            if (user.presence.activities.length === 0 || status.name !== "Spotify" && status.type !== "LISTENING"){
                return await interaction.reply({ content: `${user.user.username} is not listening to spotify!`, ephemeral: true });
            }
    
            if (status !== null && status.name === "Spotify" && status.assets !== null) {
            
                let image = `https://i.scdn.co/image/${status.assets.largeImage.slice(8)}`,
                name = status.details,
                artist = status.state,
                album = status.assets.largeText;
    
                const card = new canvacord.Spotify()
                .setAuthor(artist)
                .setAlbum(album)
                .setStartTimestamp(status.timestamps.start)
                .setEndTimestamp(status.timestamps.end)
                .setImage(image)
                .setTitle(name)
    
                const Card = await card.build();
                const attachments = new AttachmentBuilder(Card, { name: "spotify.png" }); 
                
                const embed = new EmbedBuilder()
                .setAuthor({ name: `Spotify Command ${client.config.devBy}`})
                .setColor(client.config.embedCommunity)
                .setTitle(`${user.user.username}'s Spotify Track ${client.config.arrowEmoji}`)
                .setImage(`attachment://spotify.png`)
                .setTimestamp()
                .setFooter({ text: `Spotify Tracker` })
    
                await interaction.reply({ embeds: [embed], files: [attachments] });
            }
        }
    },
};