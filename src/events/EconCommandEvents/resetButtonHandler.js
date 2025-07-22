const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const economySchema = require('../../schemas/economySchema');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isButton()) return;

        if (interaction.customId.startsWith('reset_user_confirm_') || 
            interaction.customId.startsWith('reset_server_confirm_') || 
            interaction.customId === 'reset_cancel') {

            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: "You don't have permission to use this command!",
                    ephemeral: true
                });
            }
            
            if (interaction.customId === 'reset_cancel') {
                const cancelEmbed = new EmbedBuilder()
                    .setColor('Green')
                    .setTitle('Reset Cancelled')
                    .setDescription('Economy reset has been cancelled. No data was changed.')
                    .setTimestamp();
                    
                return interaction.update({ embeds: [cancelEmbed], components: [] });
            }
            
            if (interaction.customId.startsWith('reset_user_confirm_')) {
                const userId = interaction.customId.replace('reset_user_confirm_', '');
                
                try {
                    const deletedData = await economySchema.findOneAndDelete({ 
                        Guild: interaction.guild.id, 
                        User: userId 
                    });
                    
                    let username;
                    try {
                        const user = await client.users.fetch(userId);
                        username = user.tag;
                    } catch (error) {
                        username = userId;
                    }
                    
                    const resultEmbed = new EmbedBuilder()
                        .setColor('Orange')
                        .setTitle('User Economy Reset')
                        .setDescription(deletedData 
                            ? `Successfully reset all economy data for **${username}**.` 
                            : `No economy data found for **${username}**.`)
                        .setFooter({ text: `Reset by ${interaction.user.tag}` })
                        .setTimestamp();
                        
                    if (deletedData) {
                        resultEmbed.addFields(
                            { name: '💰 Deleted Balances', value: `Wallet: $${deletedData.Wallet.toLocaleString()}\nBank: $${deletedData.Bank.toLocaleString()}`, inline: true },
                            { name: '📊 Other Data', value: `Items: ${deletedData.Inventory?.length || 0}\nBusinesses: ${deletedData.Businesses?.length || 0}\nJob: ${deletedData.Job || 'None'}`, inline: true }
                        );
                    }
                    
                    return interaction.update({ embeds: [resultEmbed], components: [] });
                    
                } catch (error) {
                    console.error("Error resetting user economy data:", error);
                    
                    return interaction.update({
                        embeds: [new EmbedBuilder()
                            .setColor('Red')
                            .setTitle('Error')
                            .setDescription(`Failed to reset user data: ${error.message}`)
                            .setTimestamp()],
                        components: []
                    });
                }
            }
            
            if (interaction.customId.startsWith('reset_server_confirm_')) {
                const guildId = interaction.customId.replace('reset_server_confirm_', '');
                
                if (guildId !== interaction.guild.id) {
                    return interaction.update({
                        embeds: [new EmbedBuilder()
                            .setColor('Red')
                            .setTitle('Error')
                            .setDescription('Guild ID mismatch. Reset cancelled for security purposes.')
                            .setTimestamp()],
                        components: []
                    });
                }
                
                try {
                    const deleteResult = await economySchema.deleteMany({ Guild: interaction.guild.id });
                    
                    const resultEmbed = new EmbedBuilder()
                        .setColor('Orange')
                        .setTitle('SERVER-WIDE ECONOMY RESET')
                        .setDescription(`Successfully reset all economy data for **${interaction.guild.name}**.\n\n**${deleteResult.deletedCount}** user accounts were deleted.`)
                        .addFields(
                            { name: '⚠️ Reset Information', value: 'All wallet balances, bank balances, inventory items, jobs, houses, businesses, and statistics have been permanently deleted.', inline: false },
                            { name: '🔨 Reset Executed By', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false }
                        )
                        .setFooter({ text: `This action has been logged` })
                        .setTimestamp();
                        
                    return interaction.update({ embeds: [resultEmbed], components: [] });
                    
                } catch (error) {
                    client.logs.error("Error resetting server economy data:", error);
                    
                    return interaction.update({
                        embeds: [new EmbedBuilder()
                            .setColor('Red')
                            .setTitle('Error')
                            .setDescription(`Failed to reset server data: ${error.message}`)
                            .setTimestamp()],
                        components: []
                    });
                }
            }
        }
    }
};
