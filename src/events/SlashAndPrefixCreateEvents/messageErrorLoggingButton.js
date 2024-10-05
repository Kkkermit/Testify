const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        try {
            if (!interaction.isButton()) return;

            const message = client.errorMessage;
            const embed = client.errorEmbed;
            const row = client.errorRow;

            if (interaction.message.id !== message.id) return;

            const { customId } = interaction;

            if (customId === 'change_color_yellow') {
                embed.setColor('#FFFF00');
                await interaction.reply({
                    content: 'This error has been marked as pending.',
                    ephemeral: true,
                });
            } else if (customId === 'change_color_green') {
                embed.setColor('#00FF00');
                await interaction.reply({
                    content: 'This error has been marked as solved.',
                    ephemeral: true,
                });
            } else if (customId === 'change_color_red') {
                embed.setColor('#FF0000');
                await interaction.reply({
                    content: 'This error has been marked as unsolved.',
                    ephemeral: true,
                });
            }

            await message.edit({ embeds: [embed], components: [row] });
            await interaction.deferUpdate();
        } catch (error) {
            client.logs.error('[ERROR_LOGGING] Error in button interaction:', error);
        }
    },
};