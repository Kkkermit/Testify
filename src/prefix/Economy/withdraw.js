const { EmbedBuilder } = require('discord.js');
const economySchema = require('../../schemas/economySchema');

module.exports = {
    name: 'withdraw',
    aliases: ['with', 'wd'],
    description: 'Withdraw money from your bank',
    usableInDms: false,
    usage: '<amount|all>',
    category: 'Economy',
    async execute(message, client, args) {
        const guild = message.guild;
        const user = message.author;
        
        if (!args[0]) {
            return message.reply("Please specify an amount to withdraw or use 'all'.");
        }
        
        const amountInput = args[0].toLowerCase();
        
        let data = await economySchema.findOne({ Guild: guild.id, User: user.id });
        
        if (!data) {
            return message.reply("You don't have an economy account yet. Create one using the economy create command!");
        }
        
        let amount;

        if (amountInput === 'all') {
            amount = data.Bank;
        } else {
            amount = parseInt(amountInput);
            
            if (isNaN(amount) || amount <= 0) {
                return message.reply("Please enter a valid positive amount or 'all'.");
            }
        }
        
        if (amount > data.Bank) {
            return message.reply(`You don't have that much money in your bank. You only have **$${data.Bank.toLocaleString()}**.`);
        }
        
        data.Bank -= amount;
        data.Wallet += amount;
        data.CommandsRan += 1;
        
        await data.save();
        
        const embed = new EmbedBuilder()
            .setColor(client.config.embedEconomyColor || '#00FF00')
            .setTitle('💸 Money Withdrawn')
            .setDescription(`You have withdrawn **$${amount.toLocaleString()}** from your bank.`)
            .addFields(
                { name: '💰 New Wallet Balance', value: `$${data.Wallet.toLocaleString()}`, inline: true },
                { name: '🏦 New Bank Balance', value: `$${data.Bank.toLocaleString()}`, inline: true }
            )
            .setFooter({ text: `${guild.name} Economy`, iconURL: guild.iconURL() })
            .setTimestamp();
            
        return message.reply({ embeds: [embed] });
    }
};
