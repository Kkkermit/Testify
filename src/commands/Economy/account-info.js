const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economySchema = require('../../schemas/economySchema');
const shopItems = require('../../utils/economyUtils/items/shopItems');
const petItems = require('../../utils/economyUtils/items/petItems');
const { getTimeBetween, getFormattedTime } = require('../../utils/timeUtils');

module.exports = {
    usableInDms: false,
    category: "Economy",
    data: new SlashCommandBuilder()
        .setName('economy-info')
        .setDescription('Economy system commands')
        .addSubcommand(subcommand => 
            subcommand.setName('acc-info')
            .setDescription('View detailed information about your economy account')
            .addUserOption(option => 
                option.setName('user')
                .setDescription('User to view (defaults to you)')
                .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand.setName('server-info')
            .setDescription('View economy statistics for the entire server')),
        
    async execute(interaction, client) {
        const { guild, options } = interaction;
        const subcommand = options.getSubcommand();
        
        if (subcommand === 'acc-info') {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const isSelf = targetUser.id === interaction.user.id;

            let data = await economySchema.findOne({ Guild: guild.id, User: targetUser.id });
            
            if (!data) {
                return interaction.reply({
                    content: isSelf 
                        ? "You don't have an economy account yet. Create one using `/economy create`!" 
                        : `${targetUser.username} doesn't have an economy account.`,
                    ephemeral: true
                });
            }
            
            const totalMoney = data.Wallet + data.Bank;
            const totalIncome = calculatePassiveIncome(data);
            
            const embed = new EmbedBuilder()
                .setColor(client.config.embedEconomyColor || '#00FF00')
                .setAuthor({ name: `${targetUser.username}'s Account Information`, iconURL: targetUser.displayAvatarURL() })
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '💰 Balance', value: `Wallet: $${data.Wallet.toLocaleString()}\nBank: $${data.Bank.toLocaleString()}\nNet Worth: $${totalMoney.toLocaleString()}`, inline: true },
                    { name: '📊 Statistics', value: `Commands: ${data.CommandsRan}\nTimes Worked: ${data.Worked}\nHours Worked: ${data.HoursWorked}\nTimes Gambled: ${data.Gambled}`, inline: true }
                )
                .setFooter({ text: `${guild.name} Economy`, iconURL: guild.iconURL() })
                .setTimestamp();

            if (data.Pet && data.Pet.id) {
                const pet = petItems.getPetById(data.Pet.id);
                if (pet) {
                    const petName = data.Pet.name || pet.name;
                    const petStatus = petItems.getPetStatus(data.Pet.happiness, data.Pet.hunger);
                    
                    embed.addFields({
                        name: `${pet.emoji} Pet: ${petName}`,
                        value: `Type: ${pet.name} (${pet.rarity})\nStatus: ${petStatus}\nHunger: ${data.Pet.hunger}%\nHappiness: ${data.Pet.happiness}%\nDaily Income Bonus: +$${pet.incomeBonus}\nUse \`/pet status\` to interact`,
                        inline: false
                    });
                }
            }

            if (data.Job && data.Job !== "Unemployed") {
                const job = shopItems.jobs.find(j => j.id === data.Job);
                if (job) {
                    const basePayPerHour = job.basePay;
                    const levelBonus = data.JobLevel * 50;
                    const totalPayPerHour = basePayPerHour + levelBonus;
                    
                    embed.addFields({
                        name: '💼 Current Job',
                        value: `${job.emoji} ${job.name} (Level ${data.JobLevel})\nBase Pay: $${basePayPerHour}/hr\nLevel Bonus: $${levelBonus}/hr\nTotal Pay: $${totalPayPerHour}/hr`,
                        inline: false
                    });
                }
            } else {
                embed.addFields({
                    name: '💼 Current Job',
                    value: 'Unemployed - Use `/shop jobs` to browse available jobs!',
                    inline: false
                });
            }
            
            if (data.DailyStreak > 0) {
                let nextReward = 500;
                if (data.DailyStreak >= 5) {
                    const streakBonus = Math.floor(data.DailyStreak / 5) * 100;
                    nextReward += streakBonus;
                }
                
                let dailyStatus = '';
                if (data.LastDaily) {
                    const now = new Date();
                    const lastDaily = new Date(data.LastDaily);
                    const nextDailyTime = new Date(lastDaily.getTime() + 86400000); 
                    
                    if (now < nextDailyTime) {
                        const timeLeft = getTimeBetween(now, nextDailyTime);
                        dailyStatus = `Available in: ${timeLeft}`;
                    } else {
                        dailyStatus = 'Available now! Use `/daily`';
                    }
                } else {
                    dailyStatus = 'Available now! Use `/daily`';
                }
                
                embed.addFields({
                    name: '📅 Daily Reward',
                    value: `Current Streak: ${data.DailyStreak} day${data.DailyStreak !== 1 ? 's' : ''}\nNext Reward: $${nextReward}\n${dailyStatus}`,
                    inline: false
                });
            } else {
                embed.addFields({
                    name: '📅 Daily Reward',
                    value: 'No active streak. Use `/daily` to start your streak!',
                    inline: false
                });
            }

            if (totalIncome > 0) {
                const petIncomeBonus = data.Pet && data.Pet.id ? petItems.getPetById(data.Pet.id)?.incomeBonus || 0 : 0;
                
                embed.addFields({
                    name: '💸 Passive Income',
                    value: `Total Daily Income: $${totalIncome.toLocaleString()}\n${formatPassiveIncomeDetails(data)}\n${petIncomeBonus > 0 ? `${data.Pet.emoji || '🐾'} Pet Bonus: +$${petIncomeBonus.toLocaleString()}/day` : ''}`,
                    inline: false
                });
            }

            if (data.House) {
                const house = shopItems.houses.find(h => h.id === data.House.id);
                if (house) {
                    const purchaseDate = new Date(data.House.purchasedAt).toLocaleDateString();
                    const sellValue = Math.floor(house.price * 0.75);
                    
                    embed.addFields({
                        name: '🏡 Property',
                        value: `${house.emoji} ${house.name}\nPurchased: ${purchaseDate}\nDaily Income: $${house.income.toLocaleString()}\nSell Value: $${sellValue.toLocaleString()}`,
                        inline: false
                    });
                }
            }

            if (data.RobberySuccess > 0 || data.RobberyFailed > 0) {
                const successRate = data.RobberySuccess + data.RobberyFailed > 0 
                    ? Math.round((data.RobberySuccess / (data.RobberySuccess + data.RobberyFailed)) * 100) 
                    : 0;
                
                let robStatus = 'Not on cooldown';
                if (data.LastRobbed) {
                    const now = new Date();
                    const lastRobbed = new Date(data.LastRobbed);
                    const nextRobTime = new Date(lastRobbed.getTime() + 3600000);
                    
                    if (now < nextRobTime) {
                        const timeLeft = getTimeBetween(now, nextRobTime);
                        robStatus = `On cooldown: ${timeLeft} remaining`;
                    }
                }
                
                embed.addFields({
                    name: '🔫 Robbery Stats',
                    value: `Successful: ${data.RobberySuccess}\nFailed: ${data.RobberyFailed}\nSuccess Rate: ${successRate}%\nStatus: ${robStatus}`,
                    inline: false
                });
            }
            
            if (data.HeistSuccess > 0 || data.HeistFailed > 0) {
                const totalHeists = data.HeistSuccess + data.HeistFailed;
                const heistSuccessRate = totalHeists > 0 
                    ? Math.round((data.HeistSuccess / totalHeists) * 100) 
                    : 0;
                
                let heistStatus = 'Not on cooldown';
                if (data.LastHeist) {
                    const now = new Date();
                    const lastHeist = new Date(data.LastHeist);
                    const nextHeistTime = new Date(lastHeist.getTime() + 10800000);
                    
                    if (now < nextHeistTime) {
                        const timeLeftMs = nextHeistTime - now;
                        heistStatus = `On cooldown: ${getFormattedTime(timeLeftMs)} remaining`;
                    }
                }
                
                embed.addFields({
                    name: '🎭 Heist Stats',
                    value: `Successful: ${data.HeistSuccess}\nFailed: ${data.HeistFailed}\nTotal Heists: ${totalHeists}\nSuccess Rate: ${heistSuccessRate}%\nStatus: ${heistStatus}`,
                    inline: false
                });
            }
            
            if (data.Inventory && data.Inventory.length > 0) {
                const itemCount = data.Inventory.length;
                const uniqueItems = new Set(data.Inventory.map(item => item.id)).size;
                
                embed.addFields({
                    name: '🎒 Inventory',
                    value: `${itemCount} item${itemCount !== 1 ? 's' : ''} (${uniqueItems} unique)\nUse \`/inventory\` to view your items`,
                    inline: false
                });
            }

            if (data.Businesses && data.Businesses.length > 0) {
                const businessCount = data.Businesses.length;
                let businessIncomeTotal = 0;
                
                for (const business of data.Businesses) {
                    const businessInfo = shopItems.businesses.find(b => b.id === business.id);
                    if (businessInfo) {
                        businessIncomeTotal += businessInfo.income;
                    }
                }
                
                embed.addFields({
                    name: '💼 Businesses',
                    value: `Owned: ${businessCount}\nDaily Income: $${businessIncomeTotal.toLocaleString()}`,
                    inline: false
                });
            }
            
            return interaction.reply({ embeds: [embed] });
        } 
        else if (subcommand === 'server-info') {
            await interaction.deferReply();
            
            try {
                const accounts = await economySchema.find({ Guild: guild.id });
                
                if (accounts.length === 0) {
                    return interaction.editReply("There are no economy accounts in this server yet!");
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
                
                const petsOwned = accounts.filter(acc => acc.Pet && acc.Pet.id).length;
                const petTypes = {};
                accounts.forEach(acc => {
                    if (acc.Pet && acc.Pet.id) {
                        const petInfo = petItems.getPetById(acc.Pet.id);
                        if (petInfo) {
                            petTypes[petInfo.rarity] = (petTypes[petInfo.rarity] || 0) + 1;
                        }
                    }
                });
                
                const petRarityText = Object.entries(petTypes)
                    .sort(([, countA], [, countB]) => countB - countA)
                    .map(([rarity, count]) => `${rarity}: ${count}`)
                    .join(', ') || 'None';
                
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
                    name: '🐾 Pets',
                    value: `Total Pets: ${petsOwned}\nRarities: ${petRarityText}`,
                    inline: true
                });
                
                embed.addFields({
                    name: '📊 Activity Statistics',
                    value: `Commands Run: ${totalCommandsRan.toLocaleString()}\nWork Sessions: ${totalWorked.toLocaleString()}\nGambling Sessions: ${totalGambled.toLocaleString()}\nRobberies Attempted: ${totalRobberies.toLocaleString()}\nHeists Attempted: ${totalHeists.toLocaleString()}`,
                    inline: true
                });
                
                return interaction.editReply({ embeds: [embed] });
                
            } catch (error) {
                console.error('Error fetching server economy info:', error);
                return interaction.editReply('An error occurred while fetching the server economy information.');
            }
        }
    }
};

function calculatePassiveIncome(userData) {
    let totalIncome = 0;
    
    if (userData.Pet && userData.Pet.id) {
        const pet = petItems.getPetById(userData.Pet.id);
        if (pet) {
            totalIncome += pet.incomeBonus;
        }
    }

    if (userData.House) {
        const houseInfo = shopItems.houses.find(h => h.id === userData.House.id);
        if (houseInfo) {
            totalIncome += houseInfo.income;
        }
    }

    if (userData.Businesses && userData.Businesses.length > 0) {
        for (const business of userData.Businesses) {
            const businessInfo = shopItems.businesses.find(b => b.id === business.id);
            if (businessInfo) {
                totalIncome += businessInfo.income;
            }
        }
    }
    
    return totalIncome;
}

function formatPassiveIncomeDetails(userData) {
    const details = [];
    
    if (userData.House) {
        const houseInfo = shopItems.houses.find(h => h.id === userData.House.id);
        if (houseInfo) {
            details.push(`${houseInfo.emoji} ${houseInfo.name}: $${houseInfo.income.toLocaleString()}/day`);
        }
    }
    
    if (userData.Businesses && userData.Businesses.length > 0) {
        for (const business of userData.Businesses) {
            const businessInfo = shopItems.businesses.find(b => b.id === business.id);
            if (businessInfo) {
                details.push(`${businessInfo.emoji} ${businessInfo.name}: $${businessInfo.income.toLocaleString()}/day`);
            }
        }
    }
    
    if (userData.Pet && userData.Pet.id) {
        const pet = petItems.getPetById(userData.Pet.id);
        if (pet && pet.incomeBonus > 0) {
            details.push(`${pet.emoji} ${userData.Pet.name || pet.name}: +$${pet.incomeBonus.toLocaleString()}/day`);
        }
    }
    
    return details.join('\n');
}
