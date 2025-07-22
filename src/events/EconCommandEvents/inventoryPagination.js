const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Store active pagination sessions
const activeSessions = new Map();

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('inventory_')) return;
        
        const messageId = interaction.message.id;
        if (!activeSessions.has(messageId)) {
            if (interaction.customId === 'inventory_prev' || interaction.customId === 'inventory_next') {
                const originalEmbed = interaction.message.embeds[0];
                if (!originalEmbed) return;
                
                const footerText = originalEmbed.footer?.text || '';
                const pageMatch = footerText.match(/Page (\d+)\/(\d+)/);
                
                if (pageMatch) {
                    const currentPage = parseInt(pageMatch[1]) - 1; 
                    const totalPages = parseInt(pageMatch[2]);
                    
                    activeSessions.set(messageId, {
                        userId: interaction.user.id,
                        currentPage,
                        totalPages,
                        embeds: [originalEmbed], 
                        guildName: interaction.guild.name,
                        guildIcon: interaction.guild.iconURL()
                    });
                }
            }
        }
        
        const session = activeSessions.get(messageId);
        if (!session) return;
        
        if (session.userId !== interaction.user.id) {
            return interaction.reply({
                content: "This inventory doesn't belong to you!",
                ephemeral: true
            });
        }
        
        let { currentPage, totalPages, embeds, guildName, guildIcon } = session;
        
        if (interaction.customId === 'inventory_prev') {
            currentPage = Math.max(0, currentPage - 1);
        } else if (interaction.customId === 'inventory_next') {
            currentPage = Math.min(totalPages - 1, currentPage + 1);
        }
        
        session.currentPage = currentPage;
        activeSessions.set(messageId, session);
        
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('inventory_prev')
                .setLabel('◀️ Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId('inventory_next')
                .setLabel('Next ▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === totalPages - 1)
        );
        
        let currentEmbed = structuredClone(embeds[currentPage] || embeds[0]);
        
        const embed = EmbedBuilder.from(currentEmbed)
            .setFooter({ 
                text: `${guildName} Economy • Page ${currentPage + 1}/${totalPages}`, 
                iconURL: guildIcon 
            });
        
        await interaction.update({ 
            embeds: [embed], 
            components: [buttons] 
        });
        
        setTimeout(() => {
            if (activeSessions.has(messageId)) {
                activeSessions.delete(messageId);
            }
        }, 300000);
    }
};
