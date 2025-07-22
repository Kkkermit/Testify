const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const economySchema = require('../../schemas/economySchema');

module.exports = {
    usableInDms: false,
    category: "Economy",
    data: new SlashCommandBuilder()
        .setName('heist')
        .setDescription('Plan a heist with other players')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of heist to perform')
                .setRequired(true)
                .addChoices(
                    { name: '🏦 Bank', value: 'bank' },
                    { name: '🎰 Casino', value: 'casino' },
                    { name: '🛒 Supermarket', value: 'market' }
                ))
        .addIntegerOption(option =>
            option.setName('team_size')
                .setDescription('Number of players needed (including yourself)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(4)),

    async execute(interaction, client) {
        const { guild, user } = interaction;
        const heistType = interaction.options.getString('type');
        const teamSize = interaction.options.getInteger('team_size');

        if (heistType === 'bank' && teamSize < 2) {
            return interaction.reply({
                content: "Bank heists require at least 2 players to start. Try a different heist type or increase team size.",
                ephemeral: true
            });
        }
        
        if (teamSize < 1 || teamSize > 4) {
            return interaction.reply({
                content: "Team size must be between 1 and 4 players.",
                ephemeral: true
            });
        }

        let userData = await economySchema.findOne({ Guild: guild.id, User: user.id });
        
        if (!userData) {
            return interaction.reply({
                content: "You don't have an economy account yet. Create one using `/economy create`!",
                ephemeral: true
            });
        }

        const now = new Date();
        if (userData.LastHeist && (now - new Date(userData.LastHeist)) < 10800000) {
            const timeLeftMs = 10800000 - (now - new Date(userData.LastHeist));
            const hours = Math.floor(timeLeftMs / 3600000);
            const minutes = Math.floor((timeLeftMs % 3600000) / 60000);
            const seconds = Math.floor((timeLeftMs % 60000) / 1000);
            
            let timeString = '';
            if (hours > 0) timeString += `${hours} hour${hours !== 1 ? 's' : ''} `;
            if (minutes > 0) timeString += `${minutes} minute${minutes !== 1 ? 's' : ''} `;
            if (seconds > 0) timeString += `${seconds} second${seconds !== 1 ? 's' : ''}`;
            
            return interaction.reply({
                content: `You need to lay low for a while after your last heist. Try again in ${timeString.trim()}.`,
                ephemeral: true
            });
        }

        const heistConfig = {
            bank: {
                name: "Bank Heist",
                emoji: "🏦",
                description: "Hit the National Bank vault - high risk, high reward!",
                entryCost: 5000,
                minPlayers: 2,
                maxPlayers: 4,
                baseReward: 20000,
                rewardPerPlayer: 10000,
                successChance: { 1: 0, 2: 0.3, 3: 0.5, 4: 0.7 }
            },
            casino: {
                name: "Casino Heist",
                emoji: "🎰",
                description: "Raid the Golden Nugget Casino - medium risk, good rewards!",
                entryCost: 2500,
                minPlayers: 1,
                maxPlayers: 4,
                baseReward: 10000,
                rewardPerPlayer: 5000,
                successChance: { 1: 0.2, 2: 0.4, 3: 0.6, 4: 0.75 }
            },
            market: {
                name: "Supermarket Robbery",
                emoji: "🛒",
                description: "Rob the local supermarket - lower risk, modest rewards.",
                entryCost: 1000,
                minPlayers: 1,
                maxPlayers: 4,
                baseReward: 5000,
                rewardPerPlayer: 2000,
                successChance: { 1: 0.3, 2: 0.5, 3: 0.7, 4: 0.85 }
            }
        };

        const selectedHeist = heistConfig[heistType];

        if (userData.Wallet < selectedHeist.entryCost) {
            return interaction.reply({
                content: `You need at least $${selectedHeist.entryCost.toLocaleString()} in your wallet to plan this heist. You only have $${userData.Wallet.toLocaleString()}.`,
                ephemeral: true
            });
        }

        const heistId = `${guild.id}-${Date.now()}`;
        
        const heistSession = {
            id: heistId,
            type: heistType,
            name: selectedHeist.name,
            emoji: selectedHeist.emoji,
            description: selectedHeist.description,
            teamSize: teamSize,
            creator: user.id,
            createdAt: now,
            entryCost: selectedHeist.entryCost,
            baseReward: selectedHeist.baseReward,
            rewardPerPlayer: selectedHeist.rewardPerPlayer,
            successChance: selectedHeist.successChance,
            participants: [
                {
                    id: user.id,
                    username: user.username,
                    joinedAt: now
                }
            ],
            status: 'waiting',
            expiresAt: new Date(now.getTime() + 900000)
        };
        
        if (!client.activeHeists) client.activeHeists = new Map();
        client.activeHeists.set(heistId, heistSession);
        
        userData.Wallet -= selectedHeist.entryCost;
        userData.CommandsRan += 1;
        await userData.save();
        
        const embed = createHeistEmbed(heistSession, client);
        
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`heist_join_${heistId}`)
                .setLabel('Join Heist')
                .setStyle(ButtonStyle.Success)
                .setEmoji('👤'),
            new ButtonBuilder()
                .setCustomId(`heist_start_${heistId}`)
                .setLabel('Start Heist')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🚨')
                .setDisabled(heistSession.participants.length < Math.min(teamSize, selectedHeist.minPlayers)),
            new ButtonBuilder()
                .setCustomId(`heist_cancel_${heistId}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❌')
        );
        
        const message = await interaction.reply({ 
            embeds: [embed], 
            components: [buttons],
            fetchReply: true
        });
        
        heistSession.messageId = message.id;
        client.activeHeists.set(heistId, heistSession);
        
        setTimeout(() => {
            const heist = client.activeHeists.get(heistId);
            if (heist && heist.status === 'waiting') {
                handleExpiredHeist(heistId, client);
            }
        }, 900000);
    }
};

function createHeistEmbed(heistSession, client) {
    const { type, name, emoji, description, teamSize, participants, status, entryCost, baseReward, rewardPerPlayer, successChance } = heistSession;
    
    const potentialReward = baseReward + (rewardPerPlayer * (participants.length - 1));
    const currentChance = successChance[participants.length] || 0;
    const percentChance = Math.round(currentChance * 100);
    
    const participantList = participants.map((p, i) => 
        `${i + 1}. ${p.username} ${p.id === heistSession.creator ? '(Leader)' : ''}`
    ).join('\n');
    
    const statusTexts = {
        'waiting': `Waiting for players (${participants.length}/${teamSize})`,
        'starting': 'Heist in progress...',
        'completed': 'Heist completed!',
        'failed': 'Heist failed!'
    };
    
    const embed = new EmbedBuilder()
        .setColor(status === 'completed' ? '#00FF00' : (status === 'failed' ? '#FF0000' : '#FFA500'))
        .setTitle(`${emoji} ${name}`)
        .setDescription(description)
        .addFields(
            { name: '💵 Entry Cost', value: `$${entryCost.toLocaleString()}`, inline: true },
            { name: '💰 Potential Reward', value: `$${potentialReward.toLocaleString()}`, inline: true },
            { name: '🎲 Success Chance', value: `${percentChance}%`, inline: true },
            { name: '👥 Team', value: participants.length > 0 ? participantList : 'No participants yet', inline: false },
            { name: '📊 Status', value: statusTexts[status], inline: false }
        )
        .setFooter({ text: `Heist ID: ${heistSession.id.substring(0, 8)}` })
        .setTimestamp();
        
    return embed;
}

async function handleExpiredHeist(heistId, client) {
    const heistSession = client.activeHeists.get(heistId);
    if (!heistSession) return;
    
    for (const participant of heistSession.participants) {
        try {
            const userData = await economySchema.findOne({ 
                Guild: heistSession.id.split('-')[0], 
                User: participant.id 
            });
            
            if (userData) {
                userData.Wallet += heistSession.entryCost;
                await userData.save();
            }
        } catch (error) {
            console.error(`Error refunding heist entry cost for user ${participant.id}:`, error);
        }
    }
    
    const embed = new EmbedBuilder()
        .setColor('#808080')
        .setTitle(`⏰ Expired: ${heistSession.emoji} ${heistSession.name}`)
        .setDescription('This heist has expired due to inactivity. Entry costs have been refunded.')
        .setFooter({ text: `Heist ID: ${heistId.substring(0, 8)}` })
        .setTimestamp();
    
    try {
        const guild = client.guilds.cache.get(heistSession.id.split('-')[0]);
        if (!guild) return;
        
        const channel = await guild.channels.fetch(heistSession.messageId.split('-')[0]).catch(() => null);
        if (!channel) return;
        
        const message = await channel.messages.fetch(heistSession.messageId).catch(() => null);
        if (!message) return;
        
        await message.edit({ 
            embeds: [embed], 
            components: [] 
        });
    } catch (error) {
        console.error('Error updating expired heist message:', error);
    }
    
    client.activeHeists.delete(heistId);
}
