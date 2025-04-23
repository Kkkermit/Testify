const { Events, ButtonBuilder, ActionRowBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { color, getTimestamp } = require('../../utils/loggingEffects.js');
const { getTopItems } = require('../../api/spotifyTrackerApi.js');
const { createStatsEmbed } = require('../../utils/createStatsEmbed.js');
const User = require('../../schemas/spotifyTrackerSystem.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isButton() || !interaction.customId.startsWith('spotify-')) {
            return;
        }

        const [prefix, type, userId, timeRange] = interaction.customId.split('-');
        const validTypes = ['tracks', 'artists', 'albums'];
        
        if (!validTypes.includes(type)) return;
        
        try {
            const targetUser = await interaction.client.users.fetch(userId);
            const user = await User.findOne({ discordId: userId });
            
            if (!user || !user.spotifyAccessToken) {
                return interaction.reply({
                    content: 'This user no longer has their Spotify account connected!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const items = await getTopItems(user.spotifyAccessToken, type, timeRange);
            const { embed, attachment } = await createStatsEmbed(items, type, targetUser, timeRange);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`spotify-tracks-${userId}-${timeRange}`)
                        .setLabel('Top Tracks')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`spotify-artists-${userId}-${timeRange}`)
                        .setLabel('Top Artists')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`spotify-albums-${userId}-${timeRange}`)
                        .setLabel('Top Albums')
                        .setStyle(ButtonStyle.Primary)
                );

            await interaction.update({
                embeds: [embed],
                files: attachment ? [attachment] : [],
                components: [row]
            });
        } catch (error) {
            console.error(`${color.red}[${getTimestamp()}] Spotify button error:`, error);
            await interaction.reply({
                content: 'Error updating stats!',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
