const { EmbedBuilder } = require('discord.js');
const economySchema = require('../../schemas/economySchema');

module.exports = {
    name: 'transfer',
    aliases: ['pay', 'send'],
    description: 'Transfer money to another user',
    usage: '<user> <amount> <wallet|bank>',
    usableInDms: false,
    category: 'Economy',
    async execute(message, client, args) {
        const { guild, author } = message;
        
        if (args.length < 3) {
            return message.reply(`Incorrect usage. Format: \`${client.config.prefix}transfer <user> <amount> <wallet|bank>\``);
        }
        
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply("Please mention a valid user to transfer money to.");
        }
        
        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount <= 0) {
            return message.reply("Please enter a valid positive amount.");
        }
        
        const source = args[2].toLowerCase();
        if (source !== 'wallet' && source !== 'bank') {
            return message.reply("Please specify either 'wallet' or 'bank' as the source of funds.");
        }
        
        if (targetUser.id === author.id) {
            return message.reply("You can't transfer money to yourself!");
        }
        
        if (targetUser.bot) {
            return message.reply("You can't transfer money to bots!");
        }
        
        let senderData = await economySchema.findOne({ Guild: guild.id, User: author.id });
        
        if (!senderData) {
            return message.reply("You don't have an economy account yet. Create one using the economy create command!");
        }
        
        let recipientData = await economySchema.findOne({ Guild: guild.id, User: targetUser.id });
        
        if (!recipientData) {
            return message.reply(`${targetUser.username} doesn't have an economy account yet.`);
        }
        
        const sourceField = source === 'wallet' ? 'Wallet' : 'Bank';
        if (senderData[sourceField] < amount) {
            return message.reply(`You don't have enough money in your ${source}. You only have $${senderData[sourceField].toLocaleString()}.`);
        }
        
        const fee = Math.ceil(amount * 0.01);
        const transferAmount = amount - fee;
        
        senderData[sourceField] -= amount;
        senderData.CommandsRan += 1;
        await senderData.save();
        
        recipientData.Wallet += transferAmount;
        await recipientData.save();
        
        const embed = new EmbedBuilder()
            .setColor(client.config.embedEconomyColor || '#00FF00')
            .setTitle('💸 Transfer Successful')
            .setDescription(`You have transferred money to ${targetUser.username}!`)
            .addFields(
                { name: '💰 Amount Sent', value: `$${amount.toLocaleString()}`, inline: true },
                { name: '💵 Transfer Fee (1%)', value: `$${fee.toLocaleString()}`, inline: true },
                { name: '🏦 Amount Received', value: `$${transferAmount.toLocaleString()}`, inline: true },
                { name: '👤 Recipient', value: `${targetUser.username}`, inline: true },
                { name: '💳 Source', value: source === 'wallet' ? 'Wallet' : 'Bank', inline: true }
            )
            .setFooter({ text: `${guild.name} Economy`, iconURL: guild.iconURL() })
            .setTimestamp();
            
        try {
            const recipient = await guild.members.fetch(targetUser.id);
            if (recipient) {
                const notificationEmbed = new EmbedBuilder()
                    .setColor(client.config.embedEconomyColor || '#00FF00')
                    .setTitle('💰 Money Received')
                    .setDescription(`You've received a money transfer from ${author.username}!`)
                    .addFields(
                        { name: '💵 Amount', value: `$${transferAmount.toLocaleString()}`, inline: true },
                        { name: '👤 From', value: `${author.username}`, inline: true }
                    )
                    .setFooter({ text: `The money has been added to your wallet` })
                    .setTimestamp();
                
                recipient.send({ embeds: [notificationEmbed] }).catch(() => {
                    
                });
            }
        } catch (error) {
            
        }
        
        return message.reply({ embeds: [embed] });
    }
};
