const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const economySchema = require('../../schemas/economySchema');
const petItems = require('../../utils/economyUtils/items/petItems');

module.exports = {
    usableInDms: false,
    category: "Economy",
    data: new SlashCommandBuilder()
        .setName('pet')
        .setDescription('Interact with your pet')
        .addSubcommand(subcommand => 
            subcommand.setName('status')
            .setDescription('View your pet\'s status'))
        .addSubcommand(subcommand => 
            subcommand.setName('feed')
            .setDescription('Feed your pet'))
        .addSubcommand(subcommand => 
            subcommand.setName('walk')
            .setDescription('Take your pet for a walk'))
        .addSubcommand(subcommand => 
            subcommand.setName('rename')
            .setDescription('Rename your pet')
            .addStringOption(option => 
                option.setName('name')
                .setDescription('The new name for your pet')
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(32))),
        
    async execute(interaction, client) {
        const { guild, user, options } = interaction;
        const subcommand = options.getSubcommand();
        
        let userData = await economySchema.findOne({ Guild: guild.id, User: user.id });
        
        if (!userData) {
            return interaction.reply({
                content: "You don't have an economy account yet. Create one using `/economy create`!",
                ephemeral: true
            });
        }

        if (!userData.Pet || !userData.Pet.id) {
            return interaction.reply({
                content: "You don't have a pet yet. Visit the shop with `/shop pets` to adopt one!",
                ephemeral: true
            });
        }

        const petDetails = petItems.getPetById(userData.Pet.id);
        if (!petDetails) {
            return interaction.reply({
                content: "There was an error finding your pet's details. Please contact an administrator.",
                ephemeral: true
            });
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
        
        switch (subcommand) {
            case 'status':
                return handleStatus(interaction, userData, petDetails, petStatus);
                
            case 'feed':
                return handleFeeding(interaction, userData, petDetails);
                
            case 'walk':
                return handleWalking(interaction, userData, petDetails);
                
            case 'rename':
                const newName = options.getString('name');
                return handleRename(interaction, userData, petDetails, newName);
        }
    }
};

async function handleStatus(interaction, userData, petDetails, petStatus) {
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
        .setFooter({ text: `${interaction.guild.name} Pet System` })
        .setTimestamp();
        
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`pet_feed_${userData.Pet.id}`)
            .setLabel('Feed Pet')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🍖')
            .setDisabled(userData.Pet.hunger >= 100),
        new ButtonBuilder()
            .setCustomId(`pet_walk_${userData.Pet.id}`)
            .setLabel('Walk Pet')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🚶')
            .setDisabled(userData.Pet.happiness >= 100)
    );
    
    return interaction.reply({ embeds: [embed], components: [buttons] });
}

async function handleFeeding(interaction, userData, petDetails) {
    if (userData.Pet.hunger >= 100) {
        return interaction.reply({
            content: `${userData.Pet.name || petDetails.name} is not hungry right now.`,
            ephemeral: true
        });
    }
    
    if (userData.Wallet < petDetails.feedCost) {
        return interaction.reply({
            content: `You need $${petDetails.feedCost.toLocaleString()} to feed your pet, but you only have $${userData.Wallet.toLocaleString()} in your wallet.`,
            ephemeral: true
        });
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
        .setFooter({ text: `${interaction.guild.name} Pet System` })
        .setTimestamp();
        
    return interaction.reply({ embeds: [embed] });
}

async function handleWalking(interaction, userData, petDetails) {
    if (userData.Pet.happiness >= 100) {
        return interaction.reply({
            content: `${userData.Pet.name || petDetails.name} is already very happy and doesn't need a walk right now.`,
            ephemeral: true
        });
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
        .setFooter({ text: `${interaction.guild.name} Pet System` })
        .setTimestamp();
        
    return interaction.reply({ embeds: [embed] });
}

async function handleRename(interaction, userData, petDetails, newName) {
    const oldName = userData.Pet.name || petDetails.name;
    userData.Pet.name = newName;
    
    await userData.save();
    
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(`${petDetails.emoji} Pet Renamed`)
        .setDescription(`You renamed your pet from **${oldName}** to **${newName}**!`)
        .setFooter({ text: `${interaction.guild.name} Pet System` })
        .setTimestamp();
        
    return interaction.reply({ embeds: [embed] });
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
