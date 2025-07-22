const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const lotterySchema = require('../../schemas/lotterySchema');
const economySchema = require('../../schemas/economySchema');
const { getNextDrawTime } = require('../../utils/economyUtils/lotteryUtils');

module.exports = {
    usableInDms: false,
    category: "Economy",
    data: new SlashCommandBuilder()
        .setName('lottery')
        .setDescription('Lottery system commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup the server lottery (Admin only)')
                .addIntegerOption(option =>
                    option.setName('entry_fee')
                        .setDescription('Cost to enter the lottery (in $)')
                        .setRequired(true)
                        .setMinValue(10))
                .addIntegerOption(option =>
                    option.setName('base_prize')
                        .setDescription('Starting prize pool amount (in $)')
                        .setRequired(true)
                        .setMinValue(100))
                .addStringOption(option =>
                    option.setName('frequency')
                        .setDescription('How often the lottery runs')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Hourly', value: 'hourly' },
                            { name: 'Daily', value: 'daily' },
                            { name: 'Weekly', value: 'weekly' }
                        ))
                .addIntegerOption(option =>
                    option.setName('max_winners')
                        .setDescription('Maximum number of winners per draw')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10))
                .addChannelOption(option =>
                    option.setName('announcement_channel')
                        .setDescription('Channel to announce lottery results')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit lottery settings (Admin only)')
                .addIntegerOption(option =>
                    option.setName('entry_fee')
                        .setDescription('Cost to enter the lottery (in $)')
                        .setMinValue(10))
                .addIntegerOption(option =>
                    option.setName('base_prize')
                        .setDescription('Starting prize pool amount (in $)')
                        .setMinValue(100))
                .addStringOption(option =>
                    option.setName('frequency')
                        .setDescription('How often the lottery runs')
                        .addChoices(
                            { name: 'Hourly', value: 'hourly' },
                            { name: 'Daily', value: 'daily' },
                            { name: 'Weekly', value: 'weekly' }
                        ))
                .addIntegerOption(option =>
                    option.setName('max_winners')
                        .setDescription('Maximum number of winners per draw')
                        .setMinValue(1)
                        .setMaxValue(10))
                .addChannelOption(option =>
                    option.setName('announcement_channel')
                        .setDescription('Channel to announce lottery results')
                        .addChannelTypes(ChannelType.GuildText)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('freeze')
                .setDescription('Freeze or unfreeze the lottery (Admin only)')
                .addBooleanOption(option =>
                    option.setName('state')
                        .setDescription('True to freeze, false to unfreeze')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable the lottery system (Admin only)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('View information about the current lottery'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy')
                .setDescription('Buy lottery tickets')
                .addIntegerOption(option =>
                    option.setName('tickets')
                        .setDescription('Number of tickets to buy')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('forcedraw')
                .setDescription('Force a lottery draw now (Admin only)')),

    async execute(interaction, client) {
        const { guild, user, options } = interaction;
        const subcommand = options.getSubcommand();
        if (['setup', 'edit', 'freeze', 'disable', 'forcedraw'].includes(subcommand)) {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({
                    content: 'You need the "Manage Server" permission to use this command.',
                    ephemeral: true
                });
            }
            switch(subcommand) {
                case 'setup':
                    return handleSetup(interaction, client);
                case 'edit':
                    return handleEdit(interaction, client);
                case 'freeze':
                    return handleFreeze(interaction, client);
                case 'disable':
                    return handleDisable(interaction, client);
                case 'forcedraw':
                    return handleForceDraw(interaction, client);
            }
        }
        switch(subcommand) {
            case 'info':
                return handleInfo(interaction, client);
            case 'buy':
                return handleBuyTickets(interaction, client);
        }
    },
};

async function handleSetup(interaction, client) {
    const { guild, user, options } = interaction;

    const existingLottery = await lotterySchema.findOne({ Guild: guild.id });
    if (existingLottery) {
        return interaction.reply({
            content: 'A lottery is already set up on this server. Use `/lottery edit` to modify it or `/lottery disable` to disable it first.',
            ephemeral: true
        });
    }
    
    const entryFee = options.getInteger('entry_fee');
    const basePrize = options.getInteger('base_prize');
    const frequency = options.getString('frequency');
    const maxWinners = options.getInteger('max_winners');
    const announcementChannel = options.getChannel('announcement_channel');
    
    const nextDrawTime = getNextDrawTime(frequency);
    
    const newLottery = new lotterySchema({
        Guild: guild.id,
        Active: true,
        Frozen: false,
        EntryFee: entryFee,
        BasePrizePool: basePrize,
        PrizePool: basePrize,
        MaxWinners: maxWinners,
        Frequency: frequency,
        NextDrawTime: nextDrawTime,
        AnnouncementChannelId: announcementChannel.id,
        CreatedBy: user.id,
        LastModifiedBy: user.id
    });
    
    await newLottery.save();
    
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🎉 Lottery System Setup')
        .setDescription('The server lottery has been successfully set up!')
        .addFields(
            { name: '💰 Entry Fee', value: `$${entryFee.toLocaleString()}`, inline: true },
            { name: '🏆 Starting Prize Pool', value: `$${basePrize.toLocaleString()}`, inline: true },
            { name: '👥 Maximum Winners', value: `${maxWinners}`, inline: true },
            { name: '⏰ Draw Frequency', value: formatFrequency(frequency), inline: true },
            { name: '📢 Announcement Channel', value: `<#${announcementChannel.id}>`, inline: true },
            { name: '🗓️ First Draw', value: `<t:${Math.floor(nextDrawTime.getTime() / 1000)}:F> (<t:${Math.floor(nextDrawTime.getTime() / 1000)}:R>)`, inline: true }
        )
        .setFooter({ text: `Set up by ${user.tag}`, iconURL: user.displayAvatarURL() })
        .setTimestamp();
    
    try {
        const announcementEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎉 New Lottery Announced!')
            .setDescription(`A new lottery has been set up on the server! Buy tickets with \`/lottery buy\` for a chance to win!`)
            .addFields(
                { name: '💰 Entry Fee', value: `$${entryFee.toLocaleString()} per ticket`, inline: true },
                { name: '🏆 Starting Prize Pool', value: `$${basePrize.toLocaleString()}`, inline: true },
                { name: '🗓️ First Draw', value: `<t:${Math.floor(nextDrawTime.getTime() / 1000)}:F> (<t:${Math.floor(nextDrawTime.getTime() / 1000)}:R>)`, inline: false }
            )
            .setFooter({ text: guild.name, iconURL: guild.iconURL() })
            .setTimestamp();
        
        await announcementChannel.send({ embeds: [announcementEmbed] });
    } catch (error) {
        console.error('Error sending announcement message:', error);
    }
    
    return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleEdit(interaction, client) {
    const { guild, user, options } = interaction;
    
    const lottery = await lotterySchema.findOne({ Guild: guild.id });
    if (!lottery) {
        return interaction.reply({
            content: 'There is no lottery set up on this server. Use `/lottery setup` to create one.',
            ephemeral: true
        });
    }
    
    if (!lottery.Active) {
        return interaction.reply({
            content: 'The lottery system is currently disabled. Use `/lottery setup` to create a new one.',
            ephemeral: true
        });
    }
    
    const entryFee = options.getInteger('entry_fee');
    const basePrize = options.getInteger('base_prize');
    const frequency = options.getString('frequency');
    const maxWinners = options.getInteger('max_winners');
    const announcementChannel = options.getChannel('announcement_channel');
    
    const changes = [];
    
    if (entryFee !== null) {
        changes.push(`Entry fee: $${lottery.EntryFee.toLocaleString()} → $${entryFee.toLocaleString()}`);
        lottery.EntryFee = entryFee;
    }
    
    if (basePrize !== null) {
        if (lottery.PrizePool === lottery.BasePrizePool) {
            changes.push(`Prize pool: $${lottery.PrizePool.toLocaleString()} → $${basePrize.toLocaleString()}`);
            lottery.PrizePool = basePrize;
        }
        changes.push(`Base prize: $${lottery.BasePrizePool.toLocaleString()} → $${basePrize.toLocaleString()}`);
        lottery.BasePrizePool = basePrize;
    }
    
    if (maxWinners !== null) {
        changes.push(`Max winners: ${lottery.MaxWinners} → ${maxWinners}`);
        lottery.MaxWinners = maxWinners;
    }
    
    if (announcementChannel !== null) {
        changes.push(`Announcement channel: <#${lottery.AnnouncementChannelId}> → <#${announcementChannel.id}>`);
        lottery.AnnouncementChannelId = announcementChannel.id;
    }
    
    if (frequency !== null) {
        changes.push(`Frequency: ${formatFrequency(lottery.Frequency)} → ${formatFrequency(frequency)}`);
        lottery.Frequency = frequency;
        
        const nextDrawTime = getNextDrawTime(frequency);
        changes.push(`Next draw: <t:${Math.floor(lottery.NextDrawTime.getTime() / 1000)}:F> → <t:${Math.floor(nextDrawTime.getTime() / 1000)}:F>`);
        lottery.NextDrawTime = nextDrawTime;
    }
    
    lottery.LastModifiedBy = user.id;
    lottery.LastModifiedAt = new Date();
    
    await lottery.save();
    
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🔄 Lottery Settings Updated')
        .setDescription(changes.length > 0 
            ? `The lottery settings have been updated:\n\n${changes.map(c => `• ${c}`).join('\n')}`
            : 'No changes were made to the lottery settings.')
        .setFooter({ text: `Updated by ${user.tag}`, iconURL: user.displayAvatarURL() })
        .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
}

async function handleFreeze(interaction, client) {
    const { guild, user, options } = interaction;
    const freezeState = options.getBoolean('state');
    
    const lottery = await lotterySchema.findOne({ Guild: guild.id });
    if (!lottery) {
        return interaction.reply({
            content: 'There is no lottery set up on this server. Use `/lottery setup` to create one.',
            ephemeral: true
        });
    }
    
    if (!lottery.Active) {
        return interaction.reply({
            content: 'The lottery system is currently disabled. Use `/lottery setup` to create a new one.',
            ephemeral: true
        });
    }
    
    if (lottery.Frozen === freezeState) {
        return interaction.reply({
            content: `The lottery is already ${freezeState ? 'frozen' : 'unfrozen'}.`,
            ephemeral: true
        });
    }
    
    lottery.Frozen = freezeState;
    lottery.LastModifiedBy = user.id;
    lottery.LastModifiedAt = new Date();
    
    await lottery.save();
    
    const embed = new EmbedBuilder()
        .setColor(freezeState ? '#FF9900' : '#00FF00')
        .setTitle(freezeState ? '❄️ Lottery Frozen' : '🔥 Lottery Unfrozen')
        .setDescription(freezeState 
            ? 'The lottery has been frozen. No new tickets can be purchased until it is unfrozen.'
            : 'The lottery has been unfrozen. Players can now purchase tickets again.')
        .setFooter({ text: `${freezeState ? 'Frozen' : 'Unfrozen'} by ${user.tag}`, iconURL: user.displayAvatarURL() })
        .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
}

async function handleDisable(interaction, client) {
    const { guild, user } = interaction;
    
    const lottery = await lotterySchema.findOne({ Guild: guild.id });
    if (!lottery) {
        return interaction.reply({
            content: 'There is no lottery set up on this server. Use `/lottery setup` to create one.',
            ephemeral: true
        });
    }
    
    if (!lottery.Active) {
        return interaction.reply({
            content: 'The lottery system is already disabled.',
            ephemeral: true
        });
    }
    
    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('⚠️ Confirm Lottery Disable')
        .setDescription('Are you sure you want to disable the lottery system?\n\nThis will:\n• Cancel the current lottery\n• Refund all purchased tickets\n• Delete the lottery configuration\n\nYou\'ll need to use `/lottery setup` to create a new lottery if you want to enable it again.')
        .setFooter({ text: `Requested by ${user.tag}`, iconURL: user.displayAvatarURL() })
        .setTimestamp();
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`lottery_disable_confirm_${guild.id}`)
                .setLabel('Confirm Disable')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`lottery_disable_cancel_${guild.id}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );
    
    return interaction.reply({ 
        embeds: [embed], 
        components: [row], 
        ephemeral: true 
    });
}

async function handleForceDraw(interaction, client) {
    const { guild, user } = interaction;
    
    const lottery = await lotterySchema.findOne({ Guild: guild.id });
    if (!lottery) {
        return interaction.reply({
            content: 'There is no lottery set up on this server. Use `/lottery setup` to create one.',
            ephemeral: true
        });
    }
    
    if (!lottery.Active) {
        return interaction.reply({
            content: 'The lottery system is currently disabled. Use `/lottery setup` to create a new one.',
            ephemeral: true
        });
    }
    
    if (lottery.Entries.length === 0) {
        return interaction.reply({
            content: 'There are no entries in the current lottery draw. No draw can be performed.',
            ephemeral: true
        });
    }
    
    await interaction.deferReply();
    
    try {
        const result = await executeLotteryDraw(lottery, client);
        
        return interaction.editReply({
            content: `Lottery draw executed successfully! Winners have been announced in <#${lottery.AnnouncementChannelId}>.`
        });
    } catch (error) {
        console.error('Error executing lottery draw:', error);
        return interaction.editReply({
            content: `An error occurred while executing the lottery draw: ${error.message}`
        });
    }
}

async function handleInfo(interaction, client) {
    const { guild, user } = interaction;
    
    const lottery = await lotterySchema.findOne({ Guild: guild.id });
    if (!lottery) {
        return interaction.reply({
            content: 'There is no lottery set up on this server. Ask an admin to create one using `/lottery setup`.',
            ephemeral: true
        });
    }
    
    if (!lottery.Active) {
        return interaction.reply({
            content: 'The lottery system is currently disabled.',
            ephemeral: true
        });
    }
    
    const userEntries = lottery.Entries.find(entry => entry.UserId === user.id);
    const userTickets = userEntries ? userEntries.Tickets : 0;
    
    const totalTickets = lottery.Entries.reduce((sum, entry) => sum + entry.Tickets, 0);
    
    const userOdds = totalTickets > 0 ? (userTickets / totalTickets) * 100 : 0;
    
    const embed = new EmbedBuilder()
        .setColor(lottery.Frozen ? '#FF9900' : '#00FF00')
        .setTitle(`🎟️ Lottery Information${lottery.Frozen ? ' (FROZEN)' : ''}`)
        .setDescription(lottery.Frozen 
            ? 'The lottery is currently frozen. No new tickets can be purchased until it is unfrozen.'
            : 'Buy tickets for a chance to win the prize pool!')
        .addFields(
            { name: '🏆 Current Prize Pool', value: `$${lottery.PrizePool.toLocaleString()}`, inline: true },
            { name: '💰 Ticket Cost', value: `$${lottery.EntryFee.toLocaleString()}`, inline: true },
            { name: '👥 Maximum Winners', value: `${lottery.MaxWinners}`, inline: true },
            { name: '🎫 Your Tickets', value: `${userTickets} ticket${userTickets !== 1 ? 's' : ''}`, inline: true },
            { name: '📊 Total Entries', value: `${totalTickets} ticket${totalTickets !== 1 ? 's' : ''}`, inline: true },
            { name: '🎯 Your Odds', value: `${userOdds.toFixed(2)}%`, inline: true },
            { name: '⏰ Next Draw', value: `<t:${Math.floor(lottery.NextDrawTime.getTime() / 1000)}:F> (<t:${Math.floor(lottery.NextDrawTime.getTime() / 1000)}:R>)`, inline: false }
        )
        .setFooter({ text: guild.name, iconURL: guild.iconURL() })
        .setTimestamp();
    
    if (lottery.History && lottery.History.length > 0) {
        const lastDraw = lottery.History[lottery.History.length - 1];
        
        let winnerString = '';
        if (lastDraw.Winners.length > 0) {
            winnerString = lastDraw.Winners.map(winner => 
                `<@${winner.UserId}> - $${winner.PrizeAmount.toLocaleString()}`
            ).join('\n');
        } else {
            winnerString = 'No winners in the last draw';
        }
        
        embed.addFields(
            { name: '🏆 Last Draw Results', value: `<t:${Math.floor(lastDraw.DrawTime.getTime() / 1000)}:F>`, inline: false },
            { name: '🏅 Winners', value: winnerString, inline: false }
        );
    }
    
    return interaction.reply({ embeds: [embed] });
}

async function handleBuyTickets(interaction, client) {
    const { guild, user, options } = interaction;
    
    const lottery = await lotterySchema.findOne({ Guild: guild.id });
    if (!lottery) {
        return interaction.reply({
            content: 'There is no lottery set up on this server. Ask an admin to create one using `/lottery setup`.',
            ephemeral: true
        });
    }
    
    if (!lottery.Active) {
        return interaction.reply({
            content: 'The lottery system is currently disabled.',
            ephemeral: true
        });
    }
    
    if (lottery.Frozen) {
        return interaction.reply({
            content: 'The lottery is currently frozen. No tickets can be purchased at this time.',
            ephemeral: true
        });
    }
    
    const numTickets = options.getInteger('tickets');
    const totalCost = numTickets * lottery.EntryFee;
    
    const economyData = await economySchema.findOne({ Guild: guild.id, User: user.id });
    if (!economyData) {
        return interaction.reply({
            content: 'You need an economy account to participate in the lottery. Create one using `/economy create`.',
            ephemeral: true
        });
    }
    
    if (economyData.Wallet < totalCost) {
        return interaction.reply({
            content: `You don't have enough money to buy ${numTickets} ticket${numTickets !== 1 ? 's' : ''}. Total cost: $${totalCost.toLocaleString()}, Your wallet: $${economyData.Wallet.toLocaleString()}.`,
            ephemeral: true
        });
    }
    
    economyData.Wallet -= totalCost;
    await economyData.save();
    
    const prizePoolAddition = Math.floor(totalCost * 0.9);
    lottery.PrizePool += prizePoolAddition;
    
    const existingEntry = lottery.Entries.find(entry => entry.UserId === user.id);
    if (existingEntry) {
        existingEntry.Tickets += numTickets;
    } else {
        lottery.Entries.push({
            UserId: user.id,
            UserTag: user.tag,
            Tickets: numTickets,
            EnteredAt: new Date()
        });
    }
    
    await lottery.save();
    
    const totalTickets = lottery.Entries.reduce((sum, entry) => sum + entry.Tickets, 0);
    const userEntry = lottery.Entries.find(entry => entry.UserId === user.id);
    const userTickets = userEntry ? userEntry.Tickets : 0;
    const userOdds = (userTickets / totalTickets) * 100;
    
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🎟️ Lottery Tickets Purchased')
        .setDescription(`You have successfully purchased ${numTickets} lottery ticket${numTickets !== 1 ? 's' : ''}!`)
        .addFields(
            { name: '💰 Cost', value: `$${totalCost.toLocaleString()}`, inline: true },
            { name: '💵 Your Balance', value: `$${economyData.Wallet.toLocaleString()}`, inline: true },
            { name: '🎫 Your Total Tickets', value: `${userTickets}`, inline: true },
            { name: '🏆 Current Prize Pool', value: `$${lottery.PrizePool.toLocaleString()}`, inline: true },
            { name: '📊 Total Entries', value: `${totalTickets} ticket${totalTickets !== 1 ? 's' : ''}`, inline: true },
            { name: '🎯 Your Odds', value: `${userOdds.toFixed(2)}%`, inline: true },
            { name: '⏰ Draw Time', value: `<t:${Math.floor(lottery.NextDrawTime.getTime() / 1000)}:F> (<t:${Math.floor(lottery.NextDrawTime.getTime() / 1000)}:R>)`, inline: false }
        )
        .setFooter({ text: `Good luck! Use /lottery info to check the status`, iconURL: user.displayAvatarURL() })
        .setTimestamp();
    
    return interaction.reply({ embeds: [embed], ephemeral: true });
}

function formatFrequency(frequency) {
    switch (frequency) {
        case 'hourly':
            return 'Every hour';
        case 'daily':
            return 'Every day';
        case 'weekly':
            return 'Every week';
        default:
            return frequency;
    }
}

async function executeLotteryDraw(lottery, client) {
    try {
        const guild = await client.guilds.fetch(lottery.Guild);
        if (!guild) throw new Error('Guild not found');
        
        const announcementChannel = await guild.channels.fetch(lottery.AnnouncementChannelId);
        if (!announcementChannel) throw new Error('Announcement channel not found');
        
        const totalTickets = lottery.Entries.reduce((sum, entry) => sum + entry.Tickets, 0);
        const totalEntries = lottery.Entries.length;
        
        const drawingRecord = {
            DrawTime: new Date(),
            TotalPrizePool: lottery.PrizePool,
            TotalTickets: totalTickets,
            Winners: []
        };
        
        const numWinners = Math.min(lottery.MaxWinners, totalEntries);
        const winners = [];
        
        if (totalTickets > 0 && numWinners > 0) {
            const ticketPool = [];
            for (const entry of lottery.Entries) {
                for (let i = 0; i < entry.Tickets; i++) {
                    ticketPool.push(entry.UserId);
                }
            }
            
            for (let i = ticketPool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [ticketPool[i], ticketPool[j]] = [ticketPool[j], ticketPool[i]];
            }
            
            const winnerIds = new Set();
            let i = 0;
            while (winnerIds.size < numWinners && i < ticketPool.length) {
                winnerIds.add(ticketPool[i]);
                i++;
            }
            
            const prizePerWinner = Math.floor(lottery.PrizePool / winnerIds.size);
            
            for (const winnerId of winnerIds) {
                const entry = lottery.Entries.find(e => e.UserId === winnerId);
                
                winners.push({
                    userId: winnerId,
                    userTag: entry.UserTag,
                    tickets: entry.Tickets,
                    prize: prizePerWinner
                });
                
                drawingRecord.Winners.push({
                    UserId: winnerId,
                    UserTag: entry.UserTag,
                    PrizeAmount: prizePerWinner
                });
                
                try {
                    const winnerEconomy = await economySchema.findOne({ Guild: lottery.Guild, User: winnerId });
                    if (winnerEconomy) {
                        winnerEconomy.Bank += prizePerWinner;
                        await winnerEconomy.save();
                    }
                } catch (error) {
                    console.error(`Error adding prize to winner ${winnerId}:`, error);
                }
            }
        }
        
        lottery.History.push(drawingRecord);
        
        lottery.PrizePool = lottery.BasePrizePool;
        lottery.Entries = [];
        lottery.NextDrawTime = getNextDrawTime(lottery.Frequency);
        
        await lottery.save();
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎉 Lottery Results 🎉')
            .setDescription(winners.length > 0 
                ? `The lottery draw has completed with ${totalTickets} total entries!`
                : 'The lottery draw has completed, but there were no participants!')
            .setFooter({ text: guild.name, iconURL: guild.iconURL() })
            .setTimestamp();
        
        if (winners.length > 0) {
            const winnersList = winners.map(w => 
                `<@${w.userId}> (${w.tickets} ticket${w.tickets !== 1 ? 's' : ''}) - **$${w.prize.toLocaleString()}**`
            ).join('\n');
            
            embed.addFields(
                { name: '🏆 Winners', value: winnersList, inline: false },
                { name: '💰 Prize per Winner', value: `$${winners[0].prize.toLocaleString()}`, inline: false },
                { name: '🎫 Total Entries', value: `${totalTickets} ticket${totalTickets !== 1 ? 's' : ''}`, inline: true },
                { name: '👥 Total Participants', value: `${totalEntries}`, inline: true }
            );
        } else {
            embed.addFields(
                { name: '😔 No Winners', value: 'No one participated in this lottery draw.', inline: false }
            );
        }
        
        embed.addFields(
            { name: '⏰ Next Draw', value: `<t:${Math.floor(lottery.NextDrawTime.getTime() / 1000)}:F> (<t:${Math.floor(lottery.NextDrawTime.getTime() / 1000)}:R>)`, inline: false },
            { name: '🏆 Starting Prize', value: `$${lottery.BasePrizePool.toLocaleString()}`, inline: false }
        );
        
        const announcement = await announcementChannel.send({ embeds: [embed] });
        
        lottery.LastDrawId = announcement.id;
        await lottery.save();
        
        return { success: true, winners };
        
    } catch (error) {
        console.error('Error executing lottery draw:', error);
        throw error;
    }
}
