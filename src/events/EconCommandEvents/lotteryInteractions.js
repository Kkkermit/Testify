const { Events, EmbedBuilder } = require('discord.js');
const lotterySchema = require('../../schemas/lotterySchema');
const economySchema = require('../../schemas/economySchema');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isButton()) return;
        
        if (interaction.customId.startsWith('lottery_disable_')) {
            const action = interaction.customId.split('_')[2];
            const guildId = interaction.customId.split('_')[3];
            
            if (interaction.guildId !== guildId) {
                return interaction.reply({
                    content: 'This button is for a different server.',
                    ephemeral: true
                });
            }
            
            if (!interaction.member.permissions.has('ManageGuild')) {
                return interaction.reply({
                    content: 'You need the "Manage Server" permission to use this.',
                    ephemeral: true
                });
            }
            
            if (action === 'cancel') {
                return interaction.update({
                    content: 'Lottery disable canceled.',
                    embeds: [],
                    components: []
                });
            }
            
            if (action === 'confirm') {
                const lottery = await lotterySchema.findOne({ Guild: guildId });
                
                if (!lottery) {
                    return interaction.update({
                        content: 'Lottery system is already disabled or does not exist.',
                        embeds: [],
                        components: []
                    });
                }
                
                await interaction.update({
                    content: 'Disabling lottery and processing refunds...',
                    embeds: [],
                    components: []
                });
                
                if (lottery.Entries.length > 0) {
                    for (const entry of lottery.Entries) {
                        try {
                            const userData = await economySchema.findOne({
                                Guild: guildId,
                                User: entry.UserId
                            });
                            
                            if (userData) {
                                const refundAmount = entry.Tickets * lottery.EntryFee;
                                userData.Wallet += refundAmount;
                                await userData.save();
                                
                                try {
                                    const user = await client.users.fetch(entry.UserId);
                                    
                                    const refundEmbed = new EmbedBuilder()
                                        .setColor('#FF9900')
                                        .setTitle('🔄 Lottery Ticket Refund')
                                        .setDescription(`The lottery on **${interaction.guild.name}** has been disabled. Your tickets have been refunded.`)
                                        .addFields(
                                            { name: '🎫 Tickets Refunded', value: `${entry.Tickets}`, inline: true },
                                            { name: '💰 Refund Amount', value: `$${refundAmount.toLocaleString()}`, inline: true }
                                        )
                                        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                                        .setTimestamp();
                                    
                                    await user.send({ embeds: [refundEmbed] }).catch(() => {
                                    });
                                } catch (err) {}
                            }
                        } catch (error) {
                            client.logs.error(`Error processing refund for user ${entry.UserId}:`, error);
                        }
                    }
                }
                
                lottery.Active = false;
                await lottery.save();
                
                try {
                    const announcementChannel = await interaction.guild.channels.fetch(lottery.AnnouncementChannelId);
                    if (announcementChannel) {
                        const disabledEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('❌ Lottery System Disabled')
                            .setDescription('The server lottery system has been disabled by an administrator.')
                            .addFields(
                                { name: '🎫 Tickets', value: 'All purchased tickets have been refunded.', inline: false }
                            )
                            .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                            .setTimestamp();
                        
                        await announcementChannel.send({ embeds: [disabledEmbed] });
                    }
                } catch (error) {
                    client.logs.error('Error sending lottery disabled message:', error);
                }
                
                await interaction.followUp({
                    content: 'Lottery system has been disabled. All ticket purchases have been refunded.',
                    ephemeral: true
                });
                
                return;
            }
        }
    }
};
