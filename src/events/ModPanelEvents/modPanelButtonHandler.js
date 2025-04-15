const { Events, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isButton() || !interaction.customId.startsWith('modpanel_')) return;
        
        const parts = interaction.customId.split('_');
        if (parts.length < 5) {
            return await interaction.reply({
                content: 'Invalid moderation panel button. Please try again.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        const prefix = parts[0]; 
        const panelId = parts[1]; 
        const moderatorId = parts[2];
        const targetId = parts[3];
        const action = parts[4];
        
        if (!client.modPanels || !client.modPanels.has(panelId)) {
            return await interaction.reply({
                content: 'This moderation panel has expired or is no longer valid. Please create a new one.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        const panelData = client.modPanels.get(panelId);
        
        if (interaction.user.id !== panelData.moderatorId) {
            return await interaction.reply({
                content: `Only the moderator who created this panel (<@${panelData.moderatorId}>) can use these controls.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (action === 'delete') {
            await interaction.message.delete().catch(error => {
                client.logs.error(`[MOD_PANEL] Error deleting message: ${error}`);
            });
            
            if (client.modPanels.has(panelId)) {
                clearTimeout(client.modPanels.get(panelId).expiryTimeout);
                client.modPanels.delete(panelId);
            }
            
            return;
        }
        
        const modal = new ModalBuilder()
            .setCustomId(`modpanel_modal_${panelId}_${action}`)
            .setTitle(`${action.charAt(0).toUpperCase() + action.slice(1)} User`);
        
        const reasonInput = new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Reason')
            .setPlaceholder('Enter the reason for this action')
            .setRequired(true)
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(1000);
        
        const reasonRow = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(reasonRow);
        
        if (action === 'timeout') {
            const durationInput = new TextInputBuilder()
                .setCustomId('duration')
                .setLabel('Duration (in minutes)')
                .setPlaceholder('Enter the timeout duration in minutes (e.g., 60)')
                .setValue('60')
                .setRequired(true)
                .setStyle(TextInputStyle.Short)
                .setMaxLength(5);
            
            const durationRow = new ActionRowBuilder().addComponents(durationInput);
            modal.addComponents(durationRow);
        }
        
        if (action === 'ban') {
            const deleteMessagesInput = new TextInputBuilder()
                .setCustomId('deleteMessages')
                .setLabel('Delete Messages (in days, 0-7)')
                .setPlaceholder('Enter number of days of messages to delete (0-7)')
                .setValue('0')
                .setRequired(true)
                .setStyle(TextInputStyle.Short)
                .setMaxLength(1);
            
            const deleteMessagesRow = new ActionRowBuilder().addComponents(deleteMessagesInput);
            modal.addComponents(deleteMessagesRow);
        }
        
        if (action === 'softban') {
            const deleteMessagesInput = new TextInputBuilder()
                .setCustomId('deleteMessages')
                .setLabel('Delete Messages (in days, 0-7)')
                .setPlaceholder('Enter number of days of messages to delete (0-7)')
                .setValue('7')
                .setRequired(true)
                .setStyle(TextInputStyle.Short)
                .setMaxLength(1);
            
            const deleteMessagesRow = new ActionRowBuilder().addComponents(deleteMessagesInput);
            modal.addComponents(deleteMessagesRow);
            
            const durationInput = new TextInputBuilder()
                .setCustomId('duration')
                .setLabel('Ban Duration (before unbanning)')
                .setPlaceholder('Format: number unit (e.g., "5 minutes", "1 day", "2 weeks")')
                .setValue('0 seconds')
                .setRequired(true)
                .setStyle(TextInputStyle.Short)
                .setMaxLength(50);
            
            const durationRow = new ActionRowBuilder().addComponents(durationInput);
            modal.addComponents(durationRow);
        }
        
        await interaction.showModal(modal).catch(error => {
            client.logs.error(`[MOD_PANEL] Error showing modal: ${error}`);
            interaction.reply({ 
                content: 'There was an error processing your request. Please try again.',
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
        });
    }
};
