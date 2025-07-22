const { EmbedBuilder } = require('discord.js');
const economySchema = require('../../schemas/economySchema');
const { getTimeBetween } = require('../../utils/timeUtils');

module.exports = {
    name: 'rob',
    aliases: ['steal'],
    description: 'Try to rob another user',
    usage: '<user>',
    usableInDms: false,
    category: 'Economy',
    async execute(message, client, args) {
        const guild = message.guild;
        const user = message.author;
        
        if (!args[0]) {
            return message.reply("You need to specify a user to rob!");
        }
        
        const target = message.mentions.users.first();
        
        if (!target) {
            return message.reply("I couldn't find that user. Please mention a valid user.");
        }
        
        if (target.id === user.id) {
            return message.reply("You can't rob yourself!");
        }
        
        if (target.bot) {
            return message.reply("You can't rob bots!");
        }
        
        let userData = await economySchema.findOne({ Guild: guild.id, User: user.id });
        let targetData = await economySchema.findOne({ Guild: guild.id, User: target.id });
        
        if (!userData) {
            return message.reply("You don't have an economy account yet. Create one using the economy create command!");
        }
        
        if (!targetData) {
            return message.reply(`${target.username} doesn't have an economy account to rob!`);
        }
        
        const now = new Date();
        
        if (userData.LastRobbed && (now - new Date(userData.LastRobbed)) < 3600000) {
            const timeLeft = getTimeBetween(now, new Date(userData.LastRobbed).getTime() + 3600000);
            
            return message.reply(`You're still laying low after your last robbery. Try again in **${timeLeft}**.`);
        }
        
        if (targetData.Wallet < 100) {
            return message.reply(`${target.username} doesn't have enough money to rob. Find a richer target!`);
        }
        
        if (userData.Wallet < 1000) {
            return message.reply("You need at least $1,000 in your wallet to attempt a robbery (risk money).");
        }
        
        const hasProtection = targetData.Inventory.find(item => item.id === "padlock");
        
        if (hasProtection) {
            const penalty = Math.floor(userData.Wallet * 0.1);
            
            userData.Wallet -= penalty;
            userData.LastRobbed = now;
            userData.RobberyFailed += 1;
            userData.CommandsRan += 1;
            
            targetData.Inventory = targetData.Inventory.filter((item, index) => {
                if (item.id === "padlock") {
                    return false; 
                }
                return true;
            });
            
            await userData.save();
            await targetData.save();
            
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🔒 Robbery Failed')
                .setDescription(`You tried to rob ${target.username} but they had a padlock! The authorities have fined you **$${penalty.toLocaleString()}**.`)
                .setFooter({ text: `${target.username}'s padlock broke in the process.` })
                .setTimestamp();
                
            return message.reply({ embeds: [embed] });
        }
        
        const successChance = 0.4;
        const success = Math.random() < successChance;
        
        if (success) {
            const stolenPercentage = Math.random() * 0.2 + 0.1;
            const stolenAmount = Math.floor(targetData.Wallet * stolenPercentage);
            
            userData.Wallet += stolenAmount;
            userData.LastRobbed = now;
            userData.RobberySuccess += 1;
            userData.CommandsRan += 1;
            userData.LastRobbedBy = null;
            
            targetData.Wallet -= stolenAmount;
            targetData.LastRobbedBy = user.id;
            
            await userData.save();
            await targetData.save();
            
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('💰 Robbery Successful')
                .setDescription(`You successfully robbed ${target.username} and stole **$${stolenAmount.toLocaleString()}**!`)
                .addFields(
                    { name: '💵 Your New Balance', value: `$${userData.Wallet.toLocaleString()}`, inline: true }
                )
                .setFooter({ text: `Better hide before they find out!` })
                .setTimestamp();
                
            return message.reply({ embeds: [embed] });
        } else {
            const penalty = Math.floor(userData.Wallet * (Math.random() * 0.1 + 0.1));
            
            userData.Wallet -= penalty;
            userData.LastRobbed = now;
            userData.RobberyFailed += 1;
            userData.CommandsRan += 1;
            
            await userData.save();
            
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🚔 Robbery Failed')
                .setDescription(`You tried to rob ${target.username} but got caught! The authorities have fined you **$${penalty.toLocaleString()}**.`)
                .addFields(
                    { name: '💵 Your New Balance', value: `$${userData.Wallet.toLocaleString()}`, inline: true }
                )
                .setFooter({ text: `Try again in 1 hour. Maybe pick an easier target?` })
                .setTimestamp();
                
            return message.reply({ embeds: [embed] });
        }
    }
};
