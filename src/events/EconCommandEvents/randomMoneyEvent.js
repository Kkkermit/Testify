const { Events, EmbedBuilder } = require('discord.js');
const economySchema = require('../../schemas/economySchema');
const treasureConfigSchema = require('../../schemas/treasureConfigSchema');

const guildMessageCounters = new Map();
const lastEventTimestamp = new Map();

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;
        
        const { guild, author, channel } = message;
        const guildId = guild.id;
        
        try {
            const config = await treasureConfigSchema.findOne({ Guild: guildId });
            
            if (!config || !config.Enabled) return;
            
            if (!guildMessageCounters.has(guildId)) {
                const messagesNeeded = Math.floor(
                    Math.random() * (config.MaxMessages - config.MinMessages + 1) + config.MinMessages
                );
                
                guildMessageCounters.set(guildId, {
                    count: 0,
                    needed: messagesNeeded
                });
            }
            
            const counterInfo = guildMessageCounters.get(guildId);
            
            counterInfo.count++;
            
            const now = Date.now();
            const lastEvent = lastEventTimestamp.get(guildId) || 0;
            const cooldownPassed = now - lastEvent > config.Cooldown;
            
            if (counterInfo.count >= counterInfo.needed && cooldownPassed) {
                counterInfo.count = 0;
                counterInfo.needed = Math.floor(
                    Math.random() * (config.MaxMessages - config.MinMessages + 1) + config.MinMessages
                );
                
                lastEventTimestamp.set(guildId, now);
                
                const amount = Math.floor(
                    Math.random() * (config.MaxAmount - config.MinAmount + 1) + config.MinAmount
                );
                
                let userData = await economySchema.findOne({ Guild: guildId, User: author.id });
                
                if (!userData) {
                    return;
                }
                
                userData.Wallet += amount;
                await userData.save();
                
                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('💰 Lucky Find!')
                    .setDescription(getRandomMoneyMessage(author.username, amount))
                    .addFields(
                        { name: '💵 Amount Found', value: `$${amount.toLocaleString()}`, inline: true },
                        { name: '👛 New Balance', value: `$${userData.Wallet.toLocaleString()}`, inline: true }
                    )
                    .setFooter({ text: `${guild.name} Economy System`, iconURL: guild.iconURL() })
                    .setTimestamp();
                
                await channel.send({ 
                    content: `<@${author.id}> just got lucky!`, 
                    embeds: [embed] 
                });
            }
        } catch (error) {
            client.logs.error("Error in random money event:", error);
        }
    }
};

function getRandomMoneyMessage(username, amount) {
    const messages = [
        `While walking through the server, ${username} stumbled upon a mysterious envelope containing **$${amount.toLocaleString()}**! Talk about being at the right place at the right time!`,
        
        `As ${username} was typing, a digital wallet materialized on their screen with **$${amount.toLocaleString()}** inside! The wonders of internet magic!`,
        
        `${username}'s keen eye spotted something shiny between the messages. They reached down and found **$${amount.toLocaleString()}** that someone must have dropped!`,
        
        `A wild Money Fairy appeared and blessed ${username} with **$${amount.toLocaleString()}** for their positive contribution to the server!`,
        
        `${username} noticed a glitching pixel on their screen, and upon clicking it, they were rewarded with **$${amount.toLocaleString()}**! Not all glitches are bad!`,
        
        `While digging through old messages, ${username} uncovered a forgotten treasure chest containing **$${amount.toLocaleString()}**!`,
        
        `A mysterious benefactor was impressed by ${username}'s message and anonymously donated **$${amount.toLocaleString()}** to their account!`,
        
        `${username} sneezed so hard they somehow phased through the digital realm and returned with **$${amount.toLocaleString()}**. Bless you!`,
        
        `The economy gods smiled upon ${username} today, raining down **$${amount.toLocaleString()}** from the virtual heavens!`,
        
        `${username}'s message was the 1 millionth in the server history! They've won a special prize of **$${amount.toLocaleString()}**!`,
        
        `While tidying up the server, ${username} found **$${amount.toLocaleString()}** tucked between two channels. Finders keepers!`,
        
        `A time traveler from the future gifted ${username} with **$${amount.toLocaleString()}**, claiming it was "for services not yet rendered."`,
        
        `${username} picked up a call from an unknown number, and somehow received **$${amount.toLocaleString()}** for extending their car's warranty.`,
        
        `${username}'s virtual pet dug up a digital bone and along with it came **$${amount.toLocaleString()}** in ancient currency!`,
        
        `A glitch in the matrix worked in ${username}'s favor today, materializing **$${amount.toLocaleString()}** in their wallet!`
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
}
