const { Events, EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const { color, getTimestamp } = require('../../utils/loggingEffects');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        try {
            if (interaction.isButton() && interaction.customId.startsWith('respond-')) {
                const userId = interaction.customId.split('-')[1];
                
                const modal = new ModalBuilder()
                    .setCustomId(`dm-response-${userId}`)
                    .setTitle('Respond to User');
                
                const messageInput = new TextInputBuilder()
                    .setCustomId('responseMessage')
                    .setLabel('Message to send to the user')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Type your response here...')
                    .setRequired(true)
                    .setMinLength(1)
                    .setMaxLength(2000);
                
                const firstActionRow = new ActionRowBuilder().addComponents(messageInput);
                modal.addComponents(firstActionRow);
                
                await interaction.showModal(modal);
            }
            
            else if (interaction.isModalSubmit() && interaction.customId.startsWith('dm-response-')) {
                const userId = interaction.customId.split('-')[2];
                const responseMessage = interaction.fields.getTextInputValue('responseMessage');
                
                try {
                    const userToMessage = await client.users.fetch(userId);
                    
                    if (!userToMessage) {
                        return await interaction.reply({
                            content: 'Unable to find user to send message to.',
                            flags: MessageFlags.Ephemeral
                        });
                    }
                    
                    await userToMessage.send({
                        content: `${responseMessage}`
                    });
                    
                    const confirmEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('Message Sent Successfully')
                        .setDescription(`Your response has been sent to **${userToMessage.tag}**`)
                        .addFields(
                            { name: 'Message Content', value: responseMessage }
                        )
                        .setFooter({ text: `Sent by ${interaction.user.tag}` })
                        .setTimestamp();
                    
                    await interaction.reply({
                        embeds: [confirmEmbed],
                        flags: MessageFlags.Ephemeral
                    });
                    
                    console.log(`${color.green}[${getTimestamp()}] [DM_RESPONSE] ${interaction.user.tag} sent a response to ${userToMessage.tag} (${userId})${color.reset}`);
                    
                } catch (error) {
                    console.error(`${color.red}[${getTimestamp()}] [DM_RESPONSE] Error sending response:${color.reset}`, error);
                    
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: 'Failed to send message. The user may have DMs closed or has blocked the bot.',
                            flags: MessageFlags.Ephemeral
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`${color.red}[${getTimestamp()}] [RESPOND_BUTTON] Error handling respond interaction:${color.reset}`, error);
            
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'An error occurred while processing this interaction.',
                        flags: MessageFlags.Ephemeral
                    });
                }
            } catch (replyError) {
                console.error(`${color.red}[${getTimestamp()}] [RESPOND_BUTTON] Error sending error response:${color.reset}`, replyError);
            }
        }
    },
};
