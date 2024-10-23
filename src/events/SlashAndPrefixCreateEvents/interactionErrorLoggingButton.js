const { Events, EmbedBuilder } = require("discord.js");

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isButton()) return;

        const message = interaction.message;
        const embed = message.embeds[0] ? EmbedBuilder.from(message.embeds[0]) : new EmbedBuilder();
        const row = message.components[0];

        const { customId } = interaction;

        if (interaction.replied || interaction.deferred) {
            console.error("Interaction has already been acknowledged.");
            return;
        }

        if (customId === 'change_color_yellow_slash') {
            embed.setColor('#FFFF00');
            await interaction.reply({
                content: 'This error has been marked as pending.',
                ephemeral: true,
            });
        } else if (customId === 'change_color_green_slash') {
            embed.setColor('#00FF00');
            await interaction.reply({
                content: 'This error has been marked as solved.',
                ephemeral: true,
            });
        } else if (customId === 'change_color_red_slash') {
            embed.setColor('#FF0000');
            await interaction.reply({
                content: 'This error has been marked as unsolved.',
                ephemeral: true,
            });
        }

        await message.edit({ embeds: [embed], components: [row] });
    }
};