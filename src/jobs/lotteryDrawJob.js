const lotterySchema = require('../schemas/lotterySchema');
const economySchema = require('../schemas/economySchema');
const { getNextDrawTime } = require('../utils/economyUtils/lotteryUtils');
const { EmbedBuilder } = require('discord.js');

async function executeLotteryDraw(lottery, client) {
    try {
        const guild = await client.guilds.fetch(lottery.Guild);
        if (!guild) {
            client.logs.error(`Guild ${lottery.Guild} not found for lottery draw`);
            return;
        }
        
        const announcementChannel = await guild.channels.fetch(lottery.AnnouncementChannelId);
        if (!announcementChannel) {
            client.logs.error(`Announcement channel ${lottery.AnnouncementChannelId} not found for lottery draw`);
            return;
        }
        
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
                        
                        try {
                            const user = await client.users.fetch(winnerId);
                            
                            const winEmbed = new EmbedBuilder()
                                .setColor('#FFD700')
                                .setTitle('🎉 You Won the Lottery! 🎉')
                                .setDescription(`Congratulations! You won the lottery on **${guild.name}**!`)
                                .addFields(
                                    { name: '💰 Prize', value: `$${prizePerWinner.toLocaleString()}`, inline: true },
                                    { name: '🎫 Your Tickets', value: `${entry.Tickets}`, inline: true },
                                    { name: '🏦 Deposit', value: 'Your winnings have been deposited to your bank account.', inline: false }
                                )
                                .setFooter({ text: guild.name, iconURL: guild.iconURL() })
                                .setTimestamp();
                            
                            await user.send({ embeds: [winEmbed] }).catch(() => {
                            });
                        } catch (err) {}
                    }
                } catch (error) {
                    client.logs.error(`Error adding prize to winner ${winnerId}:`, error);
                }
            }
        }
        
        lottery.History.push(drawingRecord);
        
        if (lottery.History.length > 10) {
            lottery.History = lottery.History.slice(-10);
        }
        
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
        
    } catch (error) {
        client.logs.error(`Error executing lottery draw for guild ${lottery.Guild}:`, error);
    }
}

async function checkLotteries(client) {
    try {
        const now = new Date();
        
        const lotteries = await lotterySchema.find({
            Active: true,
            Frozen: false,
            NextDrawTime: { $lte: now }
        });
        
        if (lotteries.length > 0) {
            for (const lottery of lotteries) {
                await executeLotteryDraw(lottery, client);
            }
        }
    } catch (error) {
        client.logs.error('Error checking lotteries:', error);
    }
}

module.exports = {
    checkLotteries,
    executeLotteryDraw
};
