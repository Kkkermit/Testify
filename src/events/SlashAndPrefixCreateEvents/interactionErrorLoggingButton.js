const { Events, EmbedBuilder } = require("discord.js");

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        try {
            if (!interaction.isButton()) return;
            
            const message = interaction.message;
            const embed = message.embeds[0] ? EmbedBuilder.from(message.embeds[0]) : new EmbedBuilder();
            const row = message.components[0];

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
    }
};