const { getTopItems } = require('../../api/spotifyTrackerApi');
const { createStatsEmbed } = require('../../utils/createStatsEmbed');
const User = require('../../schemas/spotifyTrackerSystem');
const { Events, MessageFlags } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;

        const buttonTypes = {
            'spotify-tracks': 'tracks',
            'spotify-artists': 'artists',
            'spotify-albums': 'albums'
        };

        const buttonType = buttonTypes[interaction.customId];
        if (!buttonType) return;

        try {
            const user = await User.findOne({ discordId: interaction.user.id });
            if (!user || !user.spotifyAccessToken) {
                return interaction.reply({
                    content: 'Please connect your Spotify account first!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const items = await getTopItems(user.spotifyAccessToken, buttonType);
            const embed = createStatsEmbed(items, buttonType, interaction.user);

            await interaction.update({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: 'Error updating stats!',
                flags: MessageFlags.Ephemeral
            });
        }
    },
};