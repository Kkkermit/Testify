const { EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (!interaction.isButton()) return;

        const { customId } = interaction;
        const message = interaction.message;

        try {
            if (!message || message.deleted) {
                await interaction.reply({
                    content: 'This message is no longer available.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            const oldEmbed = message.embeds[0];

            const embed = new EmbedBuilder(oldEmbed.data);
            const row = message.components[0];

            switch(customId) {
                case 'change_color_yellow_slash':
                    embed.setColor('#FFFF00');
                    await interaction.deferUpdate();
                    break;
                case 'change_color_green_slash':
                    embed.setColor('#00FF00');
                    await interaction.deferUpdate();
                    break;
                case 'change_color_red_slash':
                    embed.setColor('#FF0000');
                    await interaction.deferUpdate();
                    break;
                default:
                    return;
            }

            try {
                const fetchedMessage = await message.channel.messages.fetch(message.id);
                if (fetchedMessage) {
                    await fetchedMessage.edit({ embeds: [embed], components: [row] });
                    await interaction.followUp({
                        content: 'Status updated successfully.',
                        flags: MessageFlags.Ephemeral
                    });
                }
            } catch (error) {
                if (error.code === 10008) {
                    await interaction.followUp({
                        content: 'The message could not be updated as it no longer exists.',
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    console.error('Failed to edit message:', error);
                }
            }
        } catch (error) {
            console.error('Error handling button interaction:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'There was an error processing your request.',
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            }
        }
    }
};