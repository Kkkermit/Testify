const { EmbedBuilder, MessageFlags } = require('discord.js');
const { color, getTimestamp } = require('../../utils/loggingEffects.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (!interaction.isButton()) return;

        const { customId } = interaction;
        if (!['change_color_yellow_slash', 'change_color_green_slash', 'change_color_red_slash'].includes(customId)) {
            return;
        }

        const message = interaction.message;

        try {
            if (!message || message.deleted) {
                await interaction.reply({
                    content: 'This message is no longer available.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            if (!message.embeds.length || !message.embeds[0].title || !message.embeds[0].title.includes('Command Execution Error')) {
                await interaction.reply({
                    content: 'This button can only be used on error messages.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            let colorCode, statusText;
            switch(customId) {
                case 'change_color_yellow_slash':
                    colorCode = '#FFFF00';
                    statusText = 'Pending';
                    break;
                case 'change_color_green_slash':
                    colorCode = '#00FF00';
                    statusText = 'Solved';
                    break;
                case 'change_color_red_slash':
                    colorCode = '#FF0000';
                    statusText = 'Unsolved';
                    break;
                default:
                    return;
            }

            const oldEmbed = EmbedBuilder.from(message.embeds[0]);
            oldEmbed.setColor(colorCode);
            
            const fields = oldEmbed.data.fields || [];
            const statusFieldIndex = fields.findIndex(field => field.name === '> Status');
            
            if (statusFieldIndex !== -1) {
                fields[statusFieldIndex].value = `\`\`\`${statusText}\`\`\``;
            } else {
                oldEmbed.addFields([
                    { name: '> Status', value: `\`\`\`${statusText}\`\`\``, inline: false }
                ]);
            }

            oldEmbed.setTimestamp();
            oldEmbed.setFooter({ 
                text: `Last updated by ${interaction.user.username}`, 
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
            });

            await interaction.deferUpdate();
            
            await message.edit({ 
                embeds: [oldEmbed], 
                components: message.components 
            });
            
            await interaction.followUp({
                content: `Status updated to ${statusText} successfully.`,
                flags: MessageFlags.Ephemeral
            });
            
            console.log(`${color.green}[${getTimestamp()}] [BUTTON] Error status updated to ${statusText} by ${interaction.user.username}`);
            
        } catch (error) {
            console.error(`${color.red}[${getTimestamp()}] [BUTTON] Error handling button interaction:`, error);
            
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: 'There was an error processing your request.',
                        flags: MessageFlags.Ephemeral
                    });
                } catch (e) {
                    console.error(`${color.red}[${getTimestamp()}] [BUTTON] Failed to reply with error:`, e);
                }
            } else if (interaction.deferred) {
                try {
                    await interaction.followUp({
                        content: 'There was an error processing your request.',
                        flags: MessageFlags.Ephemeral
                    });
                } catch (e) {
                    console.error(`${color.red}[${getTimestamp()}] [BUTTON] Failed to follow up with error:`, e);
                }
            }
        }
    }
};