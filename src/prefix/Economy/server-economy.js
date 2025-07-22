const { EmbedBuilder } = require('discord.js');
const economySchema = require('../../schemas/economySchema');
const shopItems = require('../../utils/economyUtils/items/shopItems');

module.exports = {
    name: 'server-economy',
    aliases: ['server-eco', 'eco-stats', 'economy-stats'],
    description: 'View economy statistics for the entire server',
    usage: '',
    usableInDms: false,
    category: 'Economy',
    async execute(message, client, args) {
        const { guild } = message;
        
        const loadingMsg = await message.reply("Gathering economy statistics...");
        
        try {
            const accounts = await economySchema.find({ Guild: guild.id });
            
            if (accounts.length === 0) {
                return loadingMsg.edit("There are no economy accounts in this server yet!");
            }
            
            const totalAccounts = accounts.length;
            const totalMoney = accounts.reduce((sum, acc) => sum + acc.Wallet + acc.Bank, 0);
            const avgMoney = Math.floor(totalMoney / totalAccounts);
            
            const richestUser = [...accounts].sort((a, b) => (b.Wallet + b.Bank) - (a.Wallet + a.Bank))[0];
            let richestUsername = 'Unknown User';
            try {
                const user = await client.users.fetch(richestUser.User);
                richestUsername = user.username;
            } catch (error) {
                console.log("Could not fetch richest user", error);
            }
            
            const jobCounts = {};
            accounts.forEach(acc => {
                if (acc.Job && acc.Job !== "Unemployed") {
                    jobCounts[acc.Job] = (jobCounts[acc.Job] || 0) + 1;
                }
            });
            
            const topJobs = Object.entries(jobCounts)
                .sort(([, countA], [, countB]) => countB - countA)
                .slice(0, 3)
                .map(([jobId, count]) => {
                    const job = shopItems.jobs.find(j => j.id === jobId);
                    return job ? `${job.emoji} ${job.name}: ${count} user${count !== 1 ? 's' : ''}` : null;
                })
                .filter(Boolean);
            
            const houseCounts = {};
            accounts.forEach(acc => {
                if (acc.House) {
                    houseCounts[acc.House.id] = (houseCounts[acc.House.id] || 0) + 1;
                }
            });
            
            const topHouses = Object.entries(houseCounts)
                .sort(([, countA], [, countB]) => countB - countA)
                .slice(0, 3)
                .map(([houseId, count]) => {
                    const house = shopItems.houses.find(h => h.id === houseId);
                    return house ? `${house.emoji} ${house.name}: ${count} owner${count !== 1 ? 's' : ''}` : null;
                })
                .filter(Boolean);
            
            const businessCounts = {};
            accounts.forEach(acc => {
                if (acc.Businesses && acc.Businesses.length > 0) {
                    acc.Businesses.forEach(business => {
                        businessCounts[business.id] = (businessCounts[business.id] || 0) + 1;
                    });
                }
            });
            
            const topBusinesses = Object.entries(businessCounts)
                .sort(([, countA], [, countB]) => countB - countA)
                .slice(0, 3)
                .map(([businessId, count]) => {
                    const business = shopItems.businesses.find(b => b.id === businessId);
                    return business ? `${business.emoji} ${business.name}: ${count} owner${count !== 1 ? 's' : ''}` : null;
                })
                .filter(Boolean);
            
            const itemCounts = {};
            accounts.forEach(acc => {
                if (acc.Inventory && acc.Inventory.length > 0) {
                    acc.Inventory.forEach(item => {
                        itemCounts[item.id] = (itemCounts[item.id] || 0) + 1;
                    });
                }
            });
            
            const topItems = Object.entries(itemCounts)
                .sort(([, countA], [, countB]) => countB - countA)
                .slice(0, 3)
                .map(([itemId, count]) => {
                    const item = shopItems.items.find(i => i.id === itemId);
                    return item ? `${item.emoji} ${item.name}: ${count} owned` : null;
                })
                .filter(Boolean);
            
            const totalCommandsRan = accounts.reduce((sum, acc) => sum + (acc.CommandsRan || 0), 0);
            const totalWorked = accounts.reduce((sum, acc) => sum + (acc.Worked || 0), 0);
            const totalGambled = accounts.reduce((sum, acc) => sum + (acc.Gambled || 0), 0);
            const totalRobberies = accounts.reduce((sum, acc) => sum + (acc.RobberySuccess || 0) + (acc.RobberyFailed || 0), 0);
            const totalHeists = accounts.reduce((sum, acc) => sum + (acc.HeistSuccess || 0) + (acc.HeistFailed || 0), 0);
            
            const embed = new EmbedBuilder()
                .setColor(client.config.embedEconomyColor || '#00FF00')
                .setTitle(`💹 Economy Statistics for ${guild.name}`)
                .setThumbnail(guild.iconURL({ dynamic: true }))
                .addFields(
                    { name: '👥 User Statistics', value: `Accounts: ${totalAccounts}\nTotal Money: $${totalMoney.toLocaleString()}\nAverage Worth: $${avgMoney.toLocaleString()}\nRichest User: ${richestUsername} ($${(richestUser.Wallet + richestUser.Bank).toLocaleString()})`, inline: false }
                )
                .setFooter({ text: `${guild.name} Economy`, iconURL: guild.iconURL() })
                .setTimestamp();
            
            if (topJobs.length > 0) {
                embed.addFields({
                    name: '💼 Top Jobs',
                    value: topJobs.join('\n') || 'No jobs found',
                    inline: true
                });
            }
            
            if (topHouses.length > 0) {
                embed.addFields({
                    name: '🏡 Top Houses',
                    value: topHouses.join('\n') || 'No houses found',
                    inline: true
                });
            }
            
            if (topBusinesses.length > 0) {
                embed.addFields({
                    name: '🏢 Top Businesses',
                    value: topBusinesses.join('\n') || 'No businesses found',
                    inline: true
                });
            }
            
            if (topItems.length > 0) {
                embed.addFields({
                    name: '🛒 Top Items',
                    value: topItems.join('\n') || 'No items found',
                    inline: true
                });
            }
            
            embed.addFields({
                name: '📊 Activity Statistics',
                value: `Commands Run: ${totalCommandsRan.toLocaleString()}\nWork Sessions: ${totalWorked.toLocaleString()}\nGambling Sessions: ${totalGambled.toLocaleString()}\nRobberies Attempted: ${totalRobberies.toLocaleString()}\nHeists Attempted: ${totalHeists.toLocaleString()}`,
                inline: true
            });
            
            return loadingMsg.edit({ content: null, embeds: [embed] });
            
        } catch (error) {
            client.logs.error('Error fetching server economy info:', error);
            return loadingMsg.edit('An error occurred while fetching the server economy information.');
        }
    }
};
