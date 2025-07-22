const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economySchema = require('../../schemas/economySchema');

module.exports = {
    usableInDms: false,
    category: "Economy",
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your balance or another user\'s balance')
        .addUserOption(option => option.setName('user').setDescription('The user to check balance for').setRequired(false)),
    
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const { guild } = interaction;
        
        let data = await economySchema.findOne({ Guild: guild.id, User: targetUser.id });
        
        if (!data) {
            return interaction.reply({
                content: targetUser.id === interaction.user.id 
                    ? "You don't have an economy account yet. Create one using `/economy create`!" 
                    : `${targetUser.username} doesn't have an economy account yet.`,
                ephemeral: true
            });
        }
        
        const embed = new EmbedBuilder()
            .setAuthor({ name: `${targetUser.username}'s Balance`, iconURL: targetUser.displayAvatarURL() })
            .setColor(client.config.embedEconomyColor || '#00FF00')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '💰 Cash', value: `$${data.Wallet.toLocaleString()}`, inline: true },
                { name: '🏦 Bank', value: `$${data.Bank.toLocaleString()}`, inline: true },
                { name: '💵 Net Worth', value: `$${(data.Wallet + data.Bank).toLocaleString()}`, inline: true }
            )
            .setFooter({ text: `${guild.name} Economy`, iconURL: guild.iconURL() })
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    }
};
