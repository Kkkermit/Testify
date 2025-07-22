const { EmbedBuilder } = require('discord.js');
const economySchema = require('../../schemas/economySchema');
const petItems = require('../../utils/economyUtils/items/petItems');

module.exports = {
    name: 'pet',
    aliases: ['mypet'],
    description: 'Interact with your pet',
    usableInDms: false,
    usage: '<status|feed|walk|rename> [new name]',
    category: 'Economy',
    async execute(message, client, args) {
        const guild = message.guild;
        const user = message.author;
        
        let userData = await economySchema.findOne({ Guild: guild.id, User: user.id });
        
        if (!userData) {
            return message.reply("You don't have an economy account yet. Create one using economy create!");
        }

        if (!userData.Pet || !userData.Pet.id) {
            return message.reply("You don't have a pet yet. Visit the shop with the shop pets command to adopt one!");
        }

        const petDetails = petItems.getPetById(userData.Pet.id);
        if (!petDetails) {
            return message.reply("There was an error finding your pet's details. Please contact an administrator.");
        }

        userData.CommandsRan += 1;
        
        const now = new Date();
        const hoursSinceFed = userData.Pet.lastFed ? Math.floor((now - new Date(userData.Pet.lastFed)) / 3600000) : 0;
        const hoursSinceWalked = userData.Pet.lastWalked ? Math.floor((now - new Date(userData.Pet.lastWalked)) / 3600000) : 0;
        
        userData.Pet.hunger = Math.max(0, userData.Pet.hunger - (hoursSinceFed * 5));
        userData.Pet.happiness = Math.max(0, userData.Pet.happiness - (hoursSinceWalked * 5));
        
        if (hoursSinceFed > 0 || hoursSinceWalked > 0) {
            await userData.save();
        }
        
        const petStatus = petItems.getPetStatus(userData.Pet.happiness, userData.Pet.hunger);
        
        const subcommand = args[0]?.toLowerCase();
        
        if (!subcommand || subcommand === 'status') {
            return handleStatus(message, userData, petDetails, petStatus);
        } else if (subcommand === 'feed') {
            return handleFeeding(message, userData, petDetails);
        } else if (subcommand === 'walk') {
            return handleWalking(message, userData, petDetails);
        } else if (subcommand === 'rename') {
            const newName = args.slice(1).join(' ');
            if (!newName) {
                return message.reply("Please provide a new name for your pet. Usage: pet rename [new name]");
            }
            if (newName.length > 32) {
                return message.reply("The pet name must be 32 characters or less.");
            }
            return handleRename(message, userData, petDetails, newName);
        } else {
            return message.reply(`Unknown subcommand. Use: pet <status|feed|walk|rename>`);
        }
    }
};

async function handleStatus(message, userData, petDetails, petStatus) {
    const purchaseDate = userData.Pet.purchasedAt 
        ? new Date(userData.Pet.purchasedAt).toLocaleDateString() 
        : "Unknown";
    
    const lastFed = userData.Pet.lastFed 
        ? timeAgo(new Date(userData.Pet.lastFed)) 
        : "Never";
        
    const lastWalked = userData.Pet.lastWalked 
        ? timeAgo(new Date(userData.Pet.lastWalked)) 
        : "Never";
        
    const petName = userData.Pet.name || petDetails.name;
    
    const embed = new EmbedBuilder()
        .setColor(getPetStatusColor(petStatus))
        .setTitle(`${petDetails.emoji} ${petName}`)
        .setDescription(`Your ${petDetails.rarity.toLowerCase()} ${petDetails.name.toLowerCase()} is **${petStatus}**!`)
        .addFields(
            { name: '🍖 Hunger', value: createProgressBar(userData.Pet.hunger), inline: true },
            { name: '😊 Happiness', value: createProgressBar(userData.Pet.happiness), inline: true },
            { name: '📈 Income Bonus', value: `+$${petDetails.incomeBonus}/day`, inline: true },
            { name: '📅 Adopted On', value: purchaseDate, inline: true },
            { name: '🍽️ Last Fed', value: lastFed, inline: true },
            { name: '🚶 Last Walked', value: lastWalked, inline: true },
            { name: '💰 Feed Cost', value: `$${petDetails.feedCost.toLocaleString()} per meal`, inline: true }
        )
        .setFooter({ text: `${message.guild.name} Pet System` })
        .setTimestamp();
        
    return message.reply({ embeds: [embed] });
}

async function handleFeeding(message, userData, petDetails) {
    if (userData.Pet.hunger >= 100) {
        return message.reply(`${userData.Pet.name || petDetails.name} is not hungry right now.`);
    }
    
    if (userData.Wallet < petDetails.feedCost) {
        return message.reply(`You need $${petDetails.feedCost.toLocaleString()} to feed your pet, but you only have $${userData.Wallet.toLocaleString()} in your wallet.`);
    }
    
    userData.Wallet -= petDetails.feedCost;
    userData.Pet.hunger = Math.min(100, userData.Pet.hunger + 30);
    userData.Pet.lastFed = new Date();
    
    await userData.save();
    
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(`${petDetails.emoji} Pet Fed`)
        .setDescription(`You fed ${userData.Pet.name || petDetails.name} for $${petDetails.feedCost.toLocaleString()}!`)
        .addFields(
            { name: '🍖 Hunger', value: createProgressBar(userData.Pet.hunger), inline: true },
            { name: '💰 Wallet', value: `$${userData.Wallet.toLocaleString()}`, inline: true }
        )
        .setFooter({ text: `${message.guild.name} Pet System` })
        .setTimestamp();
        
    return message.reply({ embeds: [embed] });
}

async function handleWalking(message, userData, petDetails) {
    if (userData.Pet.happiness >= 100) {
        return message.reply(`${userData.Pet.name || petDetails.name} is already very happy and doesn't need a walk right now.`);
    }
    
    userData.Pet.happiness = Math.min(100, userData.Pet.happiness + 25);
    userData.Pet.lastWalked = new Date();
    
    await userData.save();
    
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(`${petDetails.emoji} Pet Walked`)
        .setDescription(`You took ${userData.Pet.name || petDetails.name} for a walk and they're feeling happier!`)
        .addFields(
            { name: '😊 Happiness', value: createProgressBar(userData.Pet.happiness), inline: true }
        )
        .setFooter({ text: `${message.guild.name} Pet System` })
        .setTimestamp();
        
    return message.reply({ embeds: [embed] });
}

async function handleRename(message, userData, petDetails, newName) {
    const oldName = userData.Pet.name || petDetails.name;
    userData.Pet.name = newName;
    
    await userData.save();
    
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(`${petDetails.emoji} Pet Renamed`)
        .setDescription(`You renamed your pet from **${oldName}** to **${newName}**!`)
        .setFooter({ text: `${message.guild.name} Pet System` })
        .setTimestamp();
        
    return message.reply({ embeds: [embed] });
}

function createProgressBar(value) {
    const filledBars = Math.round(value / 10);
    const emptyBars = 10 - filledBars;
    
    const filledSection = '█'.repeat(filledBars);
    const emptySection = '░'.repeat(emptyBars);
    
    return `${filledSection}${emptySection} ${value}%`;
}

function getPetStatusColor(status) {
    switch (status) {
        case 'Thriving': return '#00FF00';
        case 'Happy': return '#88FF88';    
        case 'Content': return '#FFFF00';  
        case 'Unhappy': return '#FFA500';  
        default: return '#FF0000';         
    }
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + " year" + (interval === 1 ? "" : "s") + " ago";
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + " month" + (interval === 1 ? "" : "s") + " ago";
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + " day" + (interval === 1 ? "" : "s") + " ago";
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + " hour" + (interval === 1 ? "" : "s") + " ago";
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + " minute" + (interval === 1 ? "" : "s") + " ago";
    
    return Math.floor(seconds) + " second" + (seconds === 1 ? "" : "s") + " ago";
}
