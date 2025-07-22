const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economySchema = require('../../schemas/economySchema');
const shopItems = require('../../utils/economyUtils/items/shopItems');
const { getTimeBetween } = require('../../utils/timeUtils');

module.exports = {
    usableInDms: false,
    category: "Economy",
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Work to earn money'),
        
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

        if (data.LastWorked && (now - new Date(data.LastWorked)) < 10800000) {
            const timeLeft = getTimeBetween(now, new Date(data.LastWorked).getTime() + 10800000);
            
            return interaction.reply({
                content: `You're still tired from your last shift. You can work again in **${timeLeft}**.`,
                ephemeral: true
            });
        }

        const userJob = data.Job !== "Unemployed" 
            ? shopItems.jobs.find(job => job.id === data.Job) 
            : { name: "Freelancing", basePay: 150, emoji: "🆓" };

        let baseAmount = userJob.basePay;
        let jobLevelBonus = data.JobLevel * 50;
        let randomVariance = Math.floor(Math.random() * 100) - 50;
        
        const amount = Math.max(50, baseAmount + jobLevelBonus + randomVariance);

        const hoursWorked = Math.floor(Math.random() * 4) + 1;

        data.Wallet += amount;
        data.LastWorked = now;
        data.Worked += 1;
        data.HoursWorked += hoursWorked;
        data.CommandsRan += 1;
        
        await data.save();
        
        const workMessages = [
            `You worked as a ${userJob.name} for ${hoursWorked} hour${hoursWorked !== 1 ? 's' : ''} and earned $${amount}!`,
            `Your shift as a ${userJob.name} lasted ${hoursWorked} hour${hoursWorked !== 1 ? 's' : ''}. You earned $${amount}!`,
            `After ${hoursWorked} hour${hoursWorked !== 1 ? 's' : ''} of hard work as a ${userJob.name}, you received $${amount}!`
        ];
        
        const embed = new EmbedBuilder()
            .setColor(client.config.embedEconomyColor || '#00FF00')
            .setTitle(`${userJob.emoji} Work Complete`)
            .setDescription(workMessages[Math.floor(Math.random() * workMessages.length)])
            .addFields(
                { name: '💼 Job', value: userJob.name, inline: true },
                { name: '💰 Earned', value: `$${amount.toLocaleString()}`, inline: true },
                { name: '⏳ Hours Worked', value: `${hoursWorked}`, inline: true },
                { name: '💵 New Balance', value: `$${data.Wallet.toLocaleString()}`, inline: true }
            )
            .setFooter({ text: "You can work again in 3 hours" })
            .setTimestamp();
            
        return interaction.reply({ embeds: [embed] });
    }
};
