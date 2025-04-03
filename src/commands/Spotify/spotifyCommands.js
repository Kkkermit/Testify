require('dotenv').config({ path: '../../../.env'});

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const { getTopItems } = require('../../api/spotifyTrackerApi');
const { createStatsEmbed } = require('../../utils/createStatsEmbed');
const User = require('../../schemas/spotifyTrackerSystem');
const canvacord = require('canvacord');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('spotify')
        .setDescription('spotify commands')
        .addSubcommand(command => command.setName('login').setDescription('Connect your Spotify account'))
        .addSubcommand(command => command.setName('stats').setDescription('View your Spotify stats').addUserOption(option => option.setName('user').setDescription('The user to get stats for').setRequired(false)).addStringOption(option => option.setName('time-range').setDescription('The time range to get stats for').setRequired(false)
            .addChoices(
                { name: 'All Time', value: 'long_term' }, 
                { name: 'Last 4 Weeks', value: 'short_term' }
            )
        ))
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
                flags: MessageFlags.Ephemeral
            });

            break;
            case 'stats':

            try {
                const targetUser = interaction.options.getUser('user') || interaction.user;
                const timeRange = interaction.options.getString('time-range') || 'long_term';
                const user = await User.findOne({ discordId: targetUser.id });
                
                if (!user || !user.spotifyAccessToken) {
                    return interaction.reply({
                        content: targetUser.id === interaction.user.id ? 
                            'Please connect your Spotify account first! You can do this by running the command `/spotify login`.' : 
                            'This user hasn\'t connected their Spotify account! They can do this by running the command `/spotify login`.',
                        flags: MessageFlags.Ephemeral
                    });
                }
    
                const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`spotify-tracks-${targetUser.id}-${timeRange}`)
                        .setLabel('Top Tracks')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`spotify-artists-${targetUser.id}-${timeRange}`)
                        .setLabel('Top Artists')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`spotify-albums-${targetUser.id}-${timeRange}`)
                        .setLabel('Top Albums')
                        .setStyle(ButtonStyle.Primary)
                );
    
                const tracks = await getTopItems(user.spotifyAccessToken, 'tracks', timeRange);
                const { embed, attachment } = await createStatsEmbed(tracks, 'tracks', targetUser, timeRange);
        
                await interaction.reply({
                    embeds: [embed],
                    files: attachment ? [attachment] : undefined,
                    components: [row]
                });
            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: 'Error fetching Spotify stats!',
                    flags: MessageFlags.Ephemeral
                });
            }

            break;
            case 'currently-playing':

            const user = interaction.options.getMember('user') || interaction.member;
                    
            if (!user) {
                return await interaction.reply({ 
                    content: 'Could not find that user!', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            if (user.bot) {
                return await interaction.reply({ 
                    content: `Invalid command. Cannot obtain a bot's spotify status.`, 
                    flags: MessageFlags.Ephemeral 
                });
            }

            if (!user.presence) {
                return await interaction.reply({ 
                    content: `${user.user.username} is not online or their status cannot be seen!`, 
                    flags: MessageFlags.Ephemeral 
                });
            }

            const activities = user.presence.activities || [];
            const spotifyActivity = activities.find(activity => activity.name === "Spotify" && activity.type === "LISTENING");

            if (!spotifyActivity || !spotifyActivity.assets) {
                return await interaction.reply({ 
                    content: `${user.user.username} is not listening to spotify at the moment! If you didn't expect this, make sure that your Spotify activity is the **top** level activity on your Discord profile.`, 
                    flags: MessageFlags.Ephemeral 
                });
            }

            const image = `https://i.scdn.co/image/${spotifyActivity.assets.largeImage.slice(8)}`;
            const name = spotifyActivity.details;
            const artist = spotifyActivity.state;
            const album = spotifyActivity.assets.largeText;

            const card = new canvacord.Spotify()
                .setAuthor(artist)
                .setAlbum(album)
                .setStartTimestamp(spotifyActivity.timestamps.start)
                .setEndTimestamp(spotifyActivity.timestamps.end)
                .setImage(image)
                .setTitle(name);

            const Card = await card.build();
            const attachments = new AttachmentBuilder(Card, { name: "spotify.png" }); 
            
            const embed = new EmbedBuilder()
                .setAuthor({ name: `Spotify Command ${client.config.devBy}`})
                .setColor(client.config.embedCommunity)
                .setTitle(`${user.user.username}'s Spotify Track ${client.config.arrowEmoji}`)
                .setImage(`attachment://spotify.png`)
                .setTimestamp()
                .setFooter({ text: `Spotify Tracker` });

            await interaction.reply({ embeds: [embed], files: [attachments] });

            break;
        }
    },
};