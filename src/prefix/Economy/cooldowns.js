const { EmbedBuilder } = require('discord.js');
const economySchema = require('../../schemas/economySchema');
const { getFormattedTime } = require('../../utils/timeUtils');

module.exports = {
    name: 'cooldowns',
    aliases: ['cd', 'cooldown'],
    description: 'View all your active cooldowns in the economy system',
    usage: '',
    usableInDms: false,
    category: 'Economy',
    async execute(message, client, args) {
        const { guild, author } = message;
        
        let data = await economySchema.findOne({ Guild: guild.id, User: author.id });
        
        if (!data) {
            return message.reply("You don't have an economy account yet. Create one using the economy create command!");
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
                    command: `${client.config.prefix}daily`
                });
            } else {
                cooldowns.push({
                    name: 'Daily Reward',
                    emoji: '📅',
                    timeLeft: 'Ready to claim!',
                    ready: true,
                    command: `${client.config.prefix}daily`
                });
            }
        } else {
            cooldowns.push({
                name: 'Daily Reward',
                emoji: '📅',
                timeLeft: 'Ready to claim!',
                ready: true,
                command: `${client.config.prefix}daily`
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
                    command: `${client.config.prefix}work`
                });
            } else {
                cooldowns.push({
                    name: 'Work',
                    emoji: '💼',
                    timeLeft: 'Ready to work!',
                    ready: true,
                    command: `${client.config.prefix}work`
                });
            }
        } else {
            cooldowns.push({
                name: 'Work',
                emoji: '💼',
                timeLeft: 'Ready to work!',
                ready: true,
                command: `${client.config.prefix}work`
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
                    command: `${client.config.prefix}rob`
                });
            } else {
                cooldowns.push({
                    name: 'Rob',
                    emoji: '🔫',
                    timeLeft: 'Ready to rob!',
                    ready: true,
                    command: `${client.config.prefix}rob`
                });
            }
        } else {
            cooldowns.push({
                name: 'Rob',
                emoji: '🔫',
                timeLeft: 'Ready to rob!',
                ready: true,
                command: `${client.config.prefix}rob`
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
                    command: `${client.config.prefix}heist`
                });
            } else {
                cooldowns.push({
                    name: 'Heist',
                    emoji: '🎭',
                    timeLeft: 'Ready for a heist!',
                    ready: true,
                    command: `${client.config.prefix}heist`
                });
            }
        } else {
            cooldowns.push({
                name: 'Heist',
                emoji: '🎭',
                timeLeft: 'Ready for a heist!',
                ready: true,
                command: `${client.config.prefix}heist`
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
        
        return message.reply({ embeds: [embed] });
    }
};
