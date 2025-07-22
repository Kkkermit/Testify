const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const economySchema = require('../../schemas/economySchema');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
        
        if (!interaction.customId.startsWith('heist_')) return;
        
        try {
            const [action, command, heistId] = interaction.customId.split('_');
            
            if (!client.activeHeists || !client.activeHeists.get(heistId)) {
                return interaction.reply({
                    content: "This heist is no longer active or has expired.",
                    ephemeral: true
                });
            }
            
            const heistSession = client.activeHeists.get(heistId);
            
            switch (command) {
                case 'join':
                    await handleJoinHeist(interaction, client, heistSession);
                    break;
                case 'start':
                    await handleStartHeist(interaction, client, heistSession);
                    break;
                case 'cancel':
                    await handleCancelHeist(interaction, client, heistSession);
                    break;
                case 'collect':
                    await handleCollectReward(interaction, client, heistSession);
                    break;
            }
        } catch (error) {
            client.logs.error('Error handling heist interaction:', error);
            
            return interaction.reply({
                content: "An error occurred while processing your request.",
                ephemeral: true
            }).catch(() => {});
        }
    }
};

async function handleJoinHeist(interaction, client, heistSession) {
    const { guild, user } = interaction;
    
    if (heistSession.status !== 'waiting') {
        return interaction.reply({
            content: "This heist has already started or ended.",
            ephemeral: true
        });
    }
    
    if (heistSession.participants.some(p => p.id === user.id)) {
        return interaction.reply({
            content: "You are already participating in this heist.",
            ephemeral: true
        });
    }
    
    if (heistSession.participants.length >= heistSession.teamSize) {
        return interaction.reply({
            content: "This heist team is already full.",
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
    
    if (userData.Wallet < heistSession.entryCost) {
        return interaction.reply({
            content: `You need $${heistSession.entryCost.toLocaleString()} in your wallet to join this heist. You only have $${userData.Wallet.toLocaleString()}.`,
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
    
    heistSession.participants.push({
        id: user.id,
        username: user.username,
        joinedAt: new Date()
    });
    
    userData.Wallet -= heistSession.entryCost;
    userData.CommandsRan += 1;
    await userData.save();
    
    client.activeHeists.set(heistSession.id, heistSession);
    
    const updatedEmbed = createHeistEmbed(heistSession, client);
    
    const canStart = heistSession.participants.length >= Math.min(heistSession.teamSize, getMinPlayers(heistSession.type));
    
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`heist_join_${heistSession.id}`)
            .setLabel('Join Heist')
            .setStyle(ButtonStyle.Success)
            .setEmoji('👤')
            .setDisabled(heistSession.participants.length >= heistSession.teamSize),
        new ButtonBuilder()
            .setCustomId(`heist_start_${heistSession.id}`)
            .setLabel('Start Heist')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🚨')
            .setDisabled(!canStart),
        new ButtonBuilder()
            .setCustomId(`heist_cancel_${heistSession.id}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌')
    );
    
    await interaction.update({ embeds: [updatedEmbed], components: [buttons] });
    
    await interaction.followUp({
        content: `You've joined the ${heistSession.emoji} ${heistSession.name}! Entry cost of $${heistSession.entryCost.toLocaleString()} has been deducted from your wallet.`,
        ephemeral: true
    });
    
    if (heistSession.participants.length === heistSession.teamSize) {
        setTimeout(() => {
            const currentHeist = client.activeHeists.get(heistSession.id);
            if (currentHeist && currentHeist.status === 'waiting') {
                handleStartHeist({ 
                    user: { id: heistSession.creator },
                    guild,
                    update: (data) => interaction.message.edit(data),
                    reply: () => null,
                    followUp: () => null
                }, client, currentHeist);
            }
        }, 3000);
    }
}

async function handleStartHeist(interaction, client, heistSession) {
    if (interaction.user.id !== heistSession.creator && !heistSession.participants.some(p => p.id === interaction.user.id)) {
        return interaction.reply({
            content: "Only participants can start this heist.",
            ephemeral: true
        });
    }
    
    const minPlayers = getMinPlayers(heistSession.type);
    if (heistSession.participants.length < minPlayers) {
        return interaction.reply({
            content: `You need at least ${minPlayers} player${minPlayers !== 1 ? 's' : ''} to start this heist.`,
            ephemeral: true
        });
    }
    
    heistSession.status = 'starting';
    client.activeHeists.set(heistSession.id, heistSession);
    
    const loadingEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle(`${heistSession.emoji} ${heistSession.name} - In Progress`)
        .setDescription(`The team is executing the heist plan... Hold tight!`)
        .addFields(
            { name: '👥 Team', value: heistSession.participants.map(p => p.username).join('\n'), inline: false },
            { name: '⏳ Status', value: 'Heist in progress...', inline: false }
        )
        .setFooter({ text: `Heist ID: ${heistSession.id.substring(0, 8)}` })
        .setTimestamp();
    
    const disabledButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`heist_join_${heistSession.id}`)
            .setLabel('Join Heist')
            .setStyle(ButtonStyle.Success)
            .setEmoji('👤')
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(`heist_start_${heistSession.id}`)
            .setLabel('Heist in Progress')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🚨')
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(`heist_cancel_${heistSession.id}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌')
            .setDisabled(true)
    );
    
    await interaction.update({ embeds: [loadingEmbed], components: [disabledButtons] });
    
    setTimeout(async () => {
        await executeHeist(heistSession, client, interaction);
    }, 5000);
}

async function handleCancelHeist(interaction, client, heistSession) {
    if (interaction.user.id !== heistSession.creator) {
        return interaction.reply({
            content: "Only the heist leader can cancel this heist.",
            ephemeral: true
        });
    }
    
    for (const participant of heistSession.participants) {
        try {
            const userData = await economySchema.findOne({ 
                Guild: interaction.guild.id, 
                User: participant.id 
            });
            
            if (userData) {
                userData.Wallet += heistSession.entryCost;
                await userData.save();
            }
        } catch (error) {
            client.logs.error(`Error refunding heist entry cost for user ${participant.id}:`, error);
        }
    }
    
    const cancelEmbed = new EmbedBuilder()
        .setColor('#808080')
        .setTitle(`❌ Cancelled: ${heistSession.emoji} ${heistSession.name}`)
        .setDescription(`This heist has been cancelled by the leader. All entry costs have been refunded.`)
        .setFooter({ text: `Heist ID: ${heistSession.id.substring(0, 8)}` })
        .setTimestamp();
    
    await interaction.update({ embeds: [cancelEmbed], components: [] });
    
    client.activeHeists.delete(heistSession.id);
}

async function handleCollectReward(interaction, client, heistSession) {
    const { user, guild } = interaction;
    
    const participant = heistSession.participants.find(p => p.id === user.id);
    if (!participant) {
        return interaction.reply({
            content: "You're not a participant in this heist.",
            ephemeral: true
        });
    }
    
    if (heistSession.status !== 'completed') {
        return interaction.reply({
            content: "There are no rewards to collect from this heist.",
            ephemeral: true
        });
    }
    
    if (participant.collected) {
        return interaction.reply({
            content: "You've already collected your reward from this heist.",
            ephemeral: true
        });
    }
    
    const userData = await economySchema.findOne({ Guild: guild.id, User: user.id });
    if (!userData) {
        return interaction.reply({
            content: "Your economy account could not be found.",
            ephemeral: true
        });
    }
    
    const reward = Math.floor(heistSession.totalReward / heistSession.participants.length);
    
    userData.Wallet += reward;
    await userData.save();
    
    participant.collected = true;
    client.activeHeists.set(heistSession.id, heistSession);
    
    const updatedEmbed = createHeistResultEmbed(heistSession, client);
    await interaction.update({ embeds: [updatedEmbed] });
    
    return interaction.followUp({
        content: `You've collected your share of $${reward.toLocaleString()} from the heist!`,
        ephemeral: true
    });
}

async function executeHeist(heistSession, client, interaction) {
    const successChance = heistSession.successChance[heistSession.participants.length] || 0;
    const isSuccessful = Math.random() < successChance;
    
    const guild = client.guilds.cache.get(heistSession.id.split('-')[0]);
    if (!guild) return;
    
    heistSession.status = isSuccessful ? 'completed' : 'failed';
    
    if (isSuccessful) {
        const totalReward = heistSession.baseReward + (heistSession.rewardPerPlayer * (heistSession.participants.length - 1));
        heistSession.totalReward = totalReward;
        
        const randomMultiplier = 0.8 + (Math.random() * 0.4);
        heistSession.totalReward = Math.floor(totalReward * randomMultiplier);
    }
    
    for (const participant of heistSession.participants) {
        try {
            const userData = await economySchema.findOne({ 
                Guild: guild.id, 
                User: participant.id 
            });
            
            if (userData) {
                userData.LastHeist = new Date();
                
                if (isSuccessful) {
                    userData.HeistSuccess = (userData.HeistSuccess || 0) + 1;
                } else {
                    userData.HeistFailed = (userData.HeistFailed || 0) + 1;
                }
                await userData.save();
            }
        } catch (error) {
            client.logs.error(`Error updating heist stats for user ${participant.id}:`, error);
        }
    }
    
    client.activeHeists.set(heistSession.id, heistSession);
    
    const resultEmbed = createHeistResultEmbed(heistSession, client);
    
    const resultButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`heist_collect_${heistSession.id}`)
            .setLabel('Collect Reward')
            .setStyle(ButtonStyle.Success)
            .setEmoji('💰')
            .setDisabled(!isSuccessful)
    );
    
    try {
        await interaction.message.edit({
            embeds: [resultEmbed],
            components: isSuccessful ? [resultButtons] : []
        });
    } catch (error) {
        client.logs.error('Error updating heist result message:', error);
    }
    
    setTimeout(() => {
        client.activeHeists.delete(heistSession.id);
    }, 3600000);
}

function getMinPlayers(heistType) {
    switch (heistType) {
        case 'bank':
            return 2;
        case 'casino':
        case 'market':
            return 1;
        default:
            return 1;
    }
}

function createHeistResultEmbed(heistSession, client) {
    const isSuccessful = heistSession.status === 'completed';
    const { emoji, name, participants, totalReward } = heistSession;
    
    const participantList = participants.map(p => 
        `${p.username} ${p.collected ? '(Collected ✓)' : ''}`
    ).join('\n');
    
    const individualReward = isSuccessful ? Math.floor(totalReward / participants.length) : 0;
    
    const events = generateHeistEvents(heistSession, isSuccessful);
    
    const embed = new EmbedBuilder()
        .setColor(isSuccessful ? '#00FF00' : '#FF0000')
        .setTitle(`${emoji} ${name} - ${isSuccessful ? 'SUCCESS!' : 'FAILED!'}`)
        .setDescription(events.join('\n\n'))
        .addFields(
            { name: '👥 Team', value: participantList, inline: false }
        )
        .setFooter({ text: `Heist ID: ${heistSession.id.substring(0, 8)}` })
        .setTimestamp();
    
    if (isSuccessful) {
        embed.addFields(
            { name: '💰 Total Haul', value: `$${totalReward.toLocaleString()}`, inline: true },
            { name: '💸 Your Cut', value: `$${individualReward.toLocaleString()} each`, inline: true }
        );
    } else {
        embed.addFields(
            { name: '📉 Outcome', value: 'The heist failed! Everyone lost their entry fee.', inline: false }
        );
    }
    
    return embed;
}

function generateHeistEvents(heistSession, isSuccessful) {
    const events = [];
    const { type, participants } = heistSession;
    
    const getRandomParticipant = () => {
        return participants[Math.floor(Math.random() * participants.length)].username;
    };
    
    if (type === 'bank') {
        const intros = [
            `The team approached the National Bank, wearing masks and carrying duffel bags. ${getRandomParticipant()} hacked into the security system while ${getRandomParticipant()} kept watch.`,
            `Under the cover of night, the crew infiltrated the National Bank. ${getRandomParticipant()} disabled the cameras while ${getRandomParticipant()} worked on the electronic locks.`,
            `Disguised as maintenance workers, the team entered the bank. ${getRandomParticipant()} distracted the security guards while ${getRandomParticipant()} slipped into the restricted area.`,
            `The heist began during the bank's busiest hour. ${getRandomParticipant()} posed as a wealthy client while ${getRandomParticipant()} quietly scoped out the vault entrance.`
        ];
        events.push(intros[Math.floor(Math.random() * intros.length)]);
    } else if (type === 'casino') {
        const intros = [
            `The team entered the Golden Nugget Casino dressed as high rollers. ${getRandomParticipant()} distracted the pit boss while ${getRandomParticipant()} worked on accessing the cashier's cage.`,
            `Posing as new staff members, the crew infiltrated the casino. ${getRandomParticipant()} kept an eye on the security monitors while ${getRandomParticipant()} headed for the counting room.`,
            `The team snuck in through the service entrance of the casino. ${getRandomParticipant()} jammed the security cameras while ${getRandomParticipant()} picked the lock to the vault.`,
            `Blending in with the crowd, the crew positioned themselves around the casino. ${getRandomParticipant()} created a distraction at the poker tables while ${getRandomParticipant()} made their move.`
        ];
        events.push(intros[Math.floor(Math.random() * intros.length)]);
    } else if (type === 'market') {
        const intros = [
            `The team entered the supermarket after hours. ${getRandomParticipant()} disabled the alarm system while ${getRandomParticipant()} headed for the safe.`,
            `Hiding until closing time, the crew emerged from within the store. ${getRandomParticipant()} kept watch while ${getRandomParticipant()} worked on cracking the manager's office.`,
            `Entering through the loading dock, the team quickly moved through the supermarket. ${getRandomParticipant()} kept an eye on the night guard while ${getRandomParticipant()} approached the registers.`,
            `The team cut the power to the supermarket as a distraction. ${getRandomParticipant()} dealt with the backup generator while ${getRandomParticipant()} moved toward the day's earnings.`
        ];
        events.push(intros[Math.floor(Math.random() * intros.length)]);
    }
    
    if (isSuccessful) {
        if (type === 'bank') {
            const middles = [
                `The vault door opened smoothly! ${getRandomParticipant()} managed to crack the safety deposit boxes while ${getRandomParticipant()} filled the bags with cash.`,
                `They reached the vault without alerting anyone! ${getRandomParticipant()} bypassed the time lock while ${getRandomParticipant()} started collecting stacks of bills.`,
                `The team found an unexpected way into the vault through an old maintenance tunnel! ${getRandomParticipant()} quickly began emptying the cash drawers while ${getRandomParticipant()} found valuable bearer bonds.`,
                `They executed the plan flawlessly! ${getRandomParticipant()} neutralized the silent alarm while ${getRandomParticipant()} drilled into the secure storage area.`
            ];
            events.push(middles[Math.floor(Math.random() * middles.length)]);
        } else if (type === 'casino') {
            const middles = [
                `${getRandomParticipant()} successfully bypassed the cage security! The team quickly filled their bags with chips and cash from the counting room.`,
                `The security shift change created the perfect opportunity! ${getRandomParticipant()} accessed the high-roller reserves while ${getRandomParticipant()} emptied the special events fund.`,
                `A perfectly timed power "malfunction" disabled the electronic locks! ${getRandomParticipant()} swiftly collected cash from the cage while ${getRandomParticipant()} grabbed chips from the reserve.`,
                `The inside information proved accurate! ${getRandomParticipant()} found the daily cash holdings while ${getRandomParticipant()} secured their escape route.`
            ];
            events.push(middles[Math.floor(Math.random() * middles.length)]);
        } else if (type === 'market') {
            const middles = [
                `The safe combination worked! ${getRandomParticipant()} emptied the registers while ${participants.length > 1 ? getRandomParticipant() : 'they'} grabbed additional valuables from the manager's office.`,
                `They timed it perfectly between security patrols! ${getRandomParticipant()} cracked the safe while ${participants.length > 1 ? getRandomParticipant() : 'they'} gathered the weekend's earnings.`,
                `The night manager's keys gave them access to everything! ${getRandomParticipant()} emptied the cash office while ${participants.length > 1 ? getRandomParticipant() : 'they'} found bonus gift cards.`,
                `The old security system was no match for them! ${getRandomParticipant()} bypassed the safe lock while ${participants.length > 1 ? getRandomParticipant() : 'they'} located the hidden cash reserves.`
            ];
            events.push(middles[Math.floor(Math.random() * middles.length)]);
        }
    } else {
        if (type === 'bank') {
            const middles = [
                `An unexpected security guard spotted ${getRandomParticipant()}! The alarm was triggered, and the team had to abort the heist immediately.`,
                `The vault's secondary security system wasn't on the blueprints! ${getRandomParticipant()} triggered a silent alarm while trying to bypass it.`,
                `A bank employee returning for a forgotten item saw ${getRandomParticipant()} and hit the panic button!`,
                `The team miscalculated the patrol timing! A guard walked in just as ${getRandomParticipant()} was accessing the vault.`
            ];
            events.push(middles[Math.floor(Math.random() * middles.length)]);
        } else if (type === 'casino') {
            const middles = [
                `The security system was more advanced than expected. ${getRandomParticipant()} triggered a silent alarm, and security started closing in on the team.`,
                `An off-duty security officer recognized suspicious behavior from ${getRandomParticipant()} and alerted the casino staff!`,
                `The team didn't account for the cash cage's weight sensors! Their actions triggered lockdown protocols.`,
                `${getRandomParticipant()} miscalculated the timing of the shift change, walking right into a group of security personnel!`
            ];
            events.push(middles[Math.floor(Math.random() * middles.length)]);
        } else if (type === 'market') {
            const middles = [
                `While working on the safe, ${getRandomParticipant()} accidentally triggered the alarm system! The team had to flee before getting any significant loot.`,
                `An unexpected night stocker was working late and spotted ${getRandomParticipant()}! They immediately called the police.`,
                `The team didn't know about the new motion sensors! Their movement in the manager's office triggered an automatic police call.`,
                `${getRandomParticipant()} made too much noise breaking into the safe room, alerting a security guard patrolling outside!`
            ];
            events.push(middles[Math.floor(Math.random() * middles.length)]);
        }
    }
    
    if (isSuccessful) {
        const successConclusions = [
            `The team made a clean getaway with the loot! Everyone met at the safehouse to split the earnings. The heist was a complete success!`,
            `With bags full of cash, the crew disappeared into the night. The perfect execution meant no one would know who pulled off the heist until long after they were gone.`,
            `The team escaped through their pre-planned route, disappearing without a trace. By the time the alarm was raised, they were already dividing their newfound wealth.`,
            `Like ghosts, the crew vanished with their prize. The perfect crime left authorities scratching their heads while the team celebrated their windfall.`
        ];
        events.push(successConclusions[Math.floor(Math.random() * successConclusions.length)]);
    } else {
        if (type === 'bank') {
            const bankFailures = [
                `Police sirens wailed in the distance as the team scattered, barely escaping empty-handed. The heist was a failure.`,
                `SWAT teams surrounded the building! The crew abandoned their tools and loot, escaping through different exits with nothing to show for their efforts.`,
                `The bank's lockdown protocol trapped ${getRandomParticipant()} momentarily! The rest of the team barely managed to help them escape, but the loot was left behind.`,
                `Security response was immediate and overwhelming. The team had to use their emergency exit strategy, leaving the vault untouched.`
            ];
            events.push(bankFailures[Math.floor(Math.random() * bankFailures.length)]);
        } else if (type === 'casino') {
            const casinoFailures = [
                `Security guards flooded the area! The team had to abandon their plans and escape through emergency exits. The heist was unsuccessful.`,
                `The casino's sophisticated facial recognition alerted guards instantly! The team scattered, prioritizing escape over the planned heist.`,
                `Armed security personnel responded faster than expected. The crew made it out, but without a single chip or dollar.`,
                `The casino's lockdown protocol engaged, nearly trapping the team! They escaped by the skin of their teeth, but the mission was a complete bust.`
            ];
            events.push(casinoFailures[Math.floor(Math.random() * casinoFailures.length)]);
        } else if (type === 'market') {
            const marketFailures = [
                `Local police arrived quickly! The team had to escape through the back door, leaving behind all potential loot. The heist failed.`,
                `The night manager returned unexpectedly! The crew had to abandon their plans and escape before being identified.`,
                `A silent alarm none of them knew about brought police to the scene within minutes. The team fled with empty hands.`,
                `Security responded with surprising efficiency. The crew barely escaped, with no time to crack the safe or access the day's earnings.`
            ];
            events.push(marketFailures[Math.floor(Math.random() * marketFailures.length)]);
        }
    }
    
    return events;
}

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
