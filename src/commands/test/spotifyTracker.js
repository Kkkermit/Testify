const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getTopItems } = require('../../api/spotifyTrackerApi');
const { createStatsEmbed } = require('../../utils/createStatsEmbed');
const User = require('../../schemas/spotifyTrackerSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('spotify-tracker')
        .setDescription('View your Spotify stats'),

    async execute(interaction) {
        try {
            const user = await User.findOne({ discordId: interaction.user.id });
            
            if (!user || !user.spotifyAccessToken) {
                return interaction.reply({
                    content: 'Please connect your Spotify account first!',
                    ephemeral: true
                });
            }

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('spotify-tracks')
                        .setLabel('Top Tracks')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('spotify-artists')
                        .setLabel('Top Artists')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('spotify-albums')
                        .setLabel('Top Albums')
                        .setStyle(ButtonStyle.Primary)
                );

            const tracks = await getTopItems(user.spotifyAccessToken, 'tracks');
            const initialEmbed = createStatsEmbed(tracks, 'tracks', interaction.user);

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
    },
};