const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economySchema = require('../../schemas/economySchema');
const { getTimeBetween } = require('../../utils/timeUtils');

module.exports = {
    usableInDms: false,
    category: "Economy",
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Collect your daily reward'),
        
    async execute(interaction, client) {
        const { guild, user } = interaction;
        
        let data = await economySchema.findOne({ Guild: guild.id, User: user.id });
        
        if (!data) {
            return interaction.reply({
                content: "You don't have an economy account yet. Create one using `/economy create`!",
                ephemeral: true
            });
        }
        
        const now = new Date();
        
        if (data.LastDaily && (now - new Date(data.LastDaily)) < 86400000) {
            const timeLeft = getTimeBetween(now, new Date(data.LastDaily).getTime() + 86400000);
            
            return interaction.reply({
                content: `You have already claimed your daily reward. Come back in **${timeLeft}**.`,
                ephemeral: true
            });
        }
        
        let streakBonus = 0;
        if (data.LastDaily && (now - new Date(data.LastDaily)) < 172800000) { 
            data.DailyStreak += 1;

            streakBonus = Math.floor(data.DailyStreak / 5) * 100;
        } else {
            data.DailyStreak = 1;
        }
        
        const baseAmount = 500;
        const bonusAmount = streakBonus;
        const totalAmount = baseAmount + bonusAmount;
        
        data.Wallet += totalAmount;
        data.LastDaily = now;
        data.CommandsRan += 1;
        
        await data.save();
        
        const embed = new EmbedBuilder()
            .setColor(client.config.embedEconomyColor || '#00FF00')
            .setTitle('💰 Daily Reward')
            .setDescription(`You've claimed your daily reward of **$${totalAmount.toLocaleString()}**!`)
            .addFields(
                { name: '💵 Base Reward', value: `$${baseAmount.toLocaleString()}`, inline: true },
                { name: '🔥 Streak Bonus', value: `$${bonusAmount.toLocaleString()}`, inline: true },
                { name: '📆 Current Streak', value: `${data.DailyStreak} day${data.DailyStreak !== 1 ? 's' : ''}`, inline: true }
            )
            .setFooter({ text: `Come back tomorrow for another reward!` })
            .setTimestamp();
            
        return interaction.reply({ embeds: [embed] });
    }
};
