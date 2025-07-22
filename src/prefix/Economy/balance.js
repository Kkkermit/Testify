const { EmbedBuilder } = require('discord.js');
const economySchema = require('../../schemas/economySchema');

module.exports = {
    name: 'balance',
    aliases: ['bal', 'money', 'wallet'],
    description: 'Check your balance or another user\'s balance',
    usage: '[user]',
    usableInDms: false,
    category: 'Economy',
    async execute(message, client, args) {
        const targetUser = message.mentions.users.first() || message.author;
        const guild = message.guild;
        
        let data = await economySchema.findOne({ Guild: guild.id, User: targetUser.id });
        
        if (!data) {
            return message.reply(
                targetUser.id === message.author.id 
                    ? "You don't have an economy account yet. Create one using the economy create command!" 
                    : `${targetUser.username} doesn't have an economy account yet.`
            );
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
            
        await message.reply({ embeds: [embed] });
    }
};
