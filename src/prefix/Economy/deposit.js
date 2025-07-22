const { EmbedBuilder } = require('discord.js');
const economySchema = require('../../schemas/economySchema');

module.exports = {
    name: 'deposit',
    aliases: ['dep'],
    description: 'Deposit money into your bank',
    usage: '<amount|all>',
    usableInDms: false,
    category: 'Economy',
    async execute(message, client, args) {
        const guild = message.guild;
        const user = message.author;
        
        if (!args[0]) {
            return message.reply("Please specify an amount to deposit or use 'all'.");
        }
        
        const amountInput = args[0].toLowerCase();
        
        let data = await economySchema.findOne({ Guild: guild.id, User: user.id });
        
        if (!data) {
            return message.reply("You don't have an economy account yet. Create one using the economy create command!");
        }
        
        let amount;
        
        if (amountInput === 'all') {
            amount = data.Wallet;
        } else {
            amount = parseInt(amountInput);
            
            if (isNaN(amount) || amount <= 0) {
                return message.reply("Please enter a valid positive amount or 'all'.");
            }
        }
        
        if (amount > data.Wallet) {
            return message.reply(`You don't have that much money in your wallet. You only have **$${data.Wallet.toLocaleString()}**.`);
        }
        
        data.Bank += amount;
        data.Wallet -= amount;
        data.CommandsRan += 1;
        
        await data.save();
        
        const embed = new EmbedBuilder()
            .setColor(client.config.embedEconomyColor || '#00FF00')
            .setTitle('💸 Money Deposited')
            .setDescription(`You have deposited **$${amount.toLocaleString()}** into your bank.`)
            .addFields(
                { name: '💰 New Wallet Balance', value: `$${data.Wallet.toLocaleString()}`, inline: true },
                { name: '🏦 New Bank Balance', value: `$${data.Bank.toLocaleString()}`, inline: true }
            )
            .setFooter({ text: `${guild.name} Economy`, iconURL: guild.iconURL() })
            .setTimestamp();
            
        return message.reply({ embeds: [embed] });
    }
};
