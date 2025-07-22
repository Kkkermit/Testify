const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economySchema = require('../../schemas/economySchema');
const { getFormattedTime } = require('../../utils/timeUtils');

module.exports = {
    usableInDms: false,
    category: "Economy",
    data: new SlashCommandBuilder()
        .setName('cooldowns')
        .setDescription('View all your active cooldowns in the economy system'),
        
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
        const cooldowns = [];
        
        if (data.LastDaily) {
            const lastDaily = new Date(data.LastDaily);
            const nextDaily = new Date(lastDaily.getTime() + 86400000);
            
            if (now < nextDaily) {
                const timeLeft = nextDaily - now;
                cooldowns.push({
                    name: 'Daily Reward',
                    emoji: '📅',
                    timeLeft: getFormattedTime(timeLeft),
                    ready: false,
                    command: '/daily'
                });
            } else {
                cooldowns.push({
                    name: 'Daily Reward',
                    emoji: '📅',
                    timeLeft: 'Ready to claim!',
                    ready: true,
                    command: '/daily'
                });
            }
        } else {
            cooldowns.push({
                name: 'Daily Reward',
                emoji: '📅',
                timeLeft: 'Ready to claim!',
                ready: true,
                command: '/daily'
            });
        }
        
        if (data.LastWorked) {
            const lastWorked = new Date(data.LastWorked);
            const nextWork = new Date(lastWorked.getTime() + 10800000);
            
            if (now < nextWork) {
                const timeLeft = nextWork - now;
                cooldowns.push({
                    name: 'Work',
                    emoji: '💼',
                    timeLeft: getFormattedTime(timeLeft),
                    ready: false,
                    command: '/work'
                });
            } else {
                cooldowns.push({
                    name: 'Work',
                    emoji: '💼',
                    timeLeft: 'Ready to work!',
                    ready: true,
                    command: '/work'
                });
            }
        } else {
            cooldowns.push({
                name: 'Work',
                emoji: '💼',
                timeLeft: 'Ready to work!',
                ready: true,
                command: '/work'
            });
        }
        
        if (data.LastRobbed) {
            const lastRobbed = new Date(data.LastRobbed);
            const nextRob = new Date(lastRobbed.getTime() + 3600000);
            
            if (now < nextRob) {
                const timeLeft = nextRob - now;
                cooldowns.push({
                    name: 'Rob',
                    emoji: '🔫',
                    timeLeft: getFormattedTime(timeLeft),
                    ready: false,
                    command: '/rob'
                });
            } else {
                cooldowns.push({
                    name: 'Rob',
                    emoji: '🔫',
                    timeLeft: 'Ready to rob!',
                    ready: true,
                    command: '/rob'
                });
            }
        } else {
            cooldowns.push({
                name: 'Rob',
                emoji: '🔫',
                timeLeft: 'Ready to rob!',
                ready: true,
                command: '/rob'
            });
        }
        
        if (data.LastHeist) {
            const lastHeist = new Date(data.LastHeist);
            const nextHeist = new Date(lastHeist.getTime() + 10800000);
            
            if (now < nextHeist) {
                const timeLeft = nextHeist - now;
                cooldowns.push({
                    name: 'Heist',
                    emoji: '🎭',
                    timeLeft: getFormattedTime(timeLeft),
                    ready: false,
                    command: '/heist'
                });
            } else {
                cooldowns.push({
                    name: 'Heist',
                    emoji: '🎭',
                    timeLeft: 'Ready for a heist!',
                    ready: true,
                    command: '/heist'
                });
            }
        } else {
            cooldowns.push({
                name: 'Heist',
                emoji: '🎭',
                timeLeft: 'Ready for a heist!',
                ready: true,
                command: '/heist'
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor(client.config.embedEconomyColor || '#00FF00')
            .setTitle('⏱️ Your Cooldowns')
            .setDescription('Here are your current economy cooldowns:')
            .setFooter({ text: `${guild.name} Economy`, iconURL: guild.iconURL() })
            .setTimestamp();
        
        for (const cooldown of cooldowns) {
            embed.addFields({
                name: `${cooldown.emoji} ${cooldown.name}`,
                value: `${cooldown.ready ? '✅' : '⏳'} ${cooldown.timeLeft}\nUse \`${cooldown.command}\``,
                inline: true
            });
        }
        
        return interaction.reply({ embeds: [embed] });
    }
};
