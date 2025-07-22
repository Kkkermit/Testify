const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const economySchema = require('../../schemas/economySchema');

module.exports = {
    name: 'give',
    aliases: ['award', 'addmoney'],
    description: 'Give money to a user (Admin only)',
    usage: '<user> <amount> <wallet|bank>',
    usableInDms: false,
    category: 'Economy',
    permissions: [PermissionFlagsBits.Administrator],
    async execute(message, client, args) {
    
        if (args.length < 3) {
            return message.reply(`Incorrect usage. Format: \`${client.config.prefix}give <user> <amount> <wallet|bank>\``);
        }
        
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply("Please mention a valid user.");
        }
        
        const amountInput = args[1];
        const type = args[2].toLowerCase();
        
        if (type !== 'wallet' && type !== 'bank') {
            return message.reply("Please specify either 'wallet' or 'bank' as the destination.");
        }
        
        let amount;
        try {
            if (amountInput.toLowerCase().endsWith('k')) {
                amount = parseInt(amountInput.slice(0, -1)) * 1000;
            } else if (amountInput.toLowerCase().endsWith('m')) {
                amount = parseInt(amountInput.slice(0, -1)) * 1000000;
            } else {
                amount = parseInt(amountInput);
            }
            
            if (isNaN(amount) || amount <= 0) {
                return message.reply("Please enter a valid positive amount.");
            }
        } catch (error) {
            return message.reply("Invalid amount format. Please provide a valid number.");
        }
        
        let userData = await economySchema.findOne({ Guild: message.guild.id, User: targetUser.id });
        
        if (!userData) {
            userData = new economySchema({
                Guild: message.guild.id,
                User: targetUser.id,
                Bank: 0,
                Wallet: 0
            });
        }
        
        if (type === 'wallet') {
            userData.Wallet += amount;
        } else if (type === 'bank') {
            userData.Bank += amount;
        }
        
        await userData.save();
        
        const embed = new EmbedBuilder()
            .setColor(client.config.embedModColor || 'Green')
            .setTitle('💰 Money Added')
            .setDescription(`You've given **$${amount.toLocaleString()}** to ${targetUser.tag}`)
            .addFields(
                { name: '💵 Amount', value: `$${amount.toLocaleString()}`, inline: true },
                { name: '🏦 Destination', value: type === 'wallet' ? 'Wallet' : 'Bank', inline: true },
                { name: '👤 Recipient', value: `${targetUser.tag}`, inline: true }
            )
            .setFooter({ text: `Admin: ${message.author.tag}` })
            .setTimestamp();
            
        return message.reply({ embeds: [embed] });
    }
};
