const { EmbedBuilder } = require('discord.js');
const economySchema = require('../../schemas/economySchema');
const shopItems = require('../../utils/economyUtils/items/shopItems');
const petItems = require('../../utils/economyUtils/items/petItems');
const { getTimeBetween } = require('../../utils/timeUtils');

module.exports = {
    name: 'account-info',
    aliases: ['acc-info', 'profile', 'economy-info'],
    description: 'View detailed information about your economy account or another user\'s account',
    usage: '[user]',
    usableInDms: false,
    category: 'Economy',
    async execute(message, client, args) {
        const guild = message.guild;
        const targetUser = message.mentions.users.first() || message.author;
        const isSelf = targetUser.id === message.author.id;
        
        let data = await economySchema.findOne({ Guild: guild.id, User: targetUser.id });
        
        if (!data) {
            return message.reply(
                isSelf 
                    ? "You don't have an economy account yet. Create one using the economy create command!" 
                    : `${targetUser.username} doesn't have an economy account.`
            );
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
                value: 'Unemployed - Use the shop jobs command to browse available jobs!',
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
                    dailyStatus = 'Available now! Use the daily command';
                }
            } else {
                dailyStatus = 'Available now! Use the daily command';
            }
            
            embed.addFields({
                name: '📅 Daily Reward',
                value: `Current Streak: ${data.DailyStreak} day${data.DailyStreak !== 1 ? 's' : ''}\nNext Reward: $${nextReward}\n${dailyStatus}`,
                inline: false
            });
        } else {
            embed.addFields({
                name: '📅 Daily Reward',
                value: 'No active streak. Use the daily command to start your streak!',
                inline: false
            });
        }
        
        if (data.Pet && data.Pet.id) {
            const pet = petItems.getPetById(data.Pet.id);
            if (pet) {
                const petName = data.Pet.name || pet.name;
                const petStatus = petItems.getPetStatus(data.Pet.happiness, data.Pet.hunger);
                
                embed.addFields({
                    name: `${pet.emoji} Pet: ${petName}`,
                    value: `Type: ${pet.name} (${pet.rarity})\nStatus: ${petStatus}\nHunger: ${data.Pet.hunger}%\nHappiness: ${data.Pet.happiness}%\nDaily Income Bonus: +$${pet.incomeBonus}\nUse the pet command to interact`,
                    inline: false
                });
            }
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
                    const timeLeft = getTimeBetween(now, nextHeistTime);
                    heistStatus = `On cooldown: ${timeLeft} remaining`;
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
                value: `${itemCount} item${itemCount !== 1 ? 's' : ''} (${uniqueItems} unique)\nUse the inventory command to view your items`,
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
        
        return message.reply({ embeds: [embed] });
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
