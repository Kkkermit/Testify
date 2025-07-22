const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const economySchema = require('../../schemas/economySchema');
const petItems = require('../../utils/economyUtils/items/petItems');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isButton()) return;
        
        if (interaction.customId.startsWith('pet_feed_') || 
            interaction.customId.startsWith('pet_walk_') ||
            interaction.customId.startsWith('pet_check_')) {
            
            try {
                
                const petId = interaction.customId.split('_')[2];
                
                if (interaction.customId.startsWith('pet_check_')) {
                    let userData = await economySchema.findOne({ 
                        Guild: interaction.guild.id, 
                        User: interaction.user.id 
                    });
                    
                    if (!userData || !userData.Pet || !userData.Pet.id) {
                        return interaction.reply({
                            content: "You don't have a pet to check.",
                            ephemeral: true
                        });
                    }
                    
                    const petDetails = petItems.getPetById(userData.Pet.id);
                    if (!petDetails) {
                        return interaction.reply({
                            content: "There was an error finding your pet's details.",
                            ephemeral: true
                        });
                    }
                    
                    const now = new Date();
                    const hoursSinceFed = userData.Pet.lastFed ? Math.floor((now - new Date(userData.Pet.lastFed)) / 3600000) : 0;
                    const hoursSinceWalked = userData.Pet.lastWalked ? Math.floor((now - new Date(userData.Pet.lastWalked)) / 3600000) : 0;
                    
                    userData.Pet.hunger = Math.max(0, userData.Pet.hunger - (hoursSinceFed * 5));
                    userData.Pet.happiness = Math.max(0, userData.Pet.happiness - (hoursSinceWalked * 5));
                    
                    if (hoursSinceFed > 0 || hoursSinceWalked > 0) {
                        await userData.save();
                    }
                    
                    const petStatus = petItems.getPetStatus(userData.Pet.happiness, userData.Pet.hunger);
                    
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
                    
                    return interaction.update({ embeds: [embed], components: [buttons] });
                }
                
                if (interaction.customId.startsWith('pet_feed_')) {
                    let userData = await economySchema.findOne({ 
                        Guild: interaction.guild.id, 
                        User: interaction.user.id 
                    });
                    
                    if (!userData || !userData.Pet || userData.Pet.id !== petId) {
                        return interaction.reply({
                            content: "You don't have this pet anymore or there was an error accessing your data.",
                            ephemeral: true
                        });
                    }
                    
                    const petDetails = petItems.getPetById(userData.Pet.id);
                    if (!petDetails) {
                        return interaction.reply({
                            content: "There was an error finding your pet's details.",
                            ephemeral: true
                        });
                    }
                    
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
                        
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
                
                if (interaction.customId.startsWith('pet_walk_')) {
                    let userData = await economySchema.findOne({ 
                        Guild: interaction.guild.id, 
                        User: interaction.user.id 
                    });
                    
                    if (!userData || !userData.Pet || userData.Pet.id !== petId) {
                        return interaction.reply({
                            content: "You don't have this pet anymore or there was an error accessing your data.",
                            ephemeral: true
                        });
                    }
                    
                    const petDetails = petItems.getPetById(userData.Pet.id);
                    if (!petDetails) {
                        return interaction.reply({
                            content: "There was an error finding your pet's details.",
                            ephemeral: true
                        });
                    }
                    
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
                        
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
                
            } catch (error) {
                client.logs.error("Pet interaction error:", error);
                return interaction.reply({
                    content: "An error occurred while processing your pet interaction.",
                    ephemeral: true
                }).catch(err => {
                    client.logs.error("Failed to respond to pet interaction:", err);
                });
            }
        }
        
        if (interaction.customId.startsWith('rehome_confirm_') || 
            interaction.customId.startsWith('rehome_cancel_')) {
            
            const userId = interaction.customId.split('_')[2];
            
            if (userId !== interaction.user.id) {
                return interaction.reply({
                    content: "This button is not for you.",
                    ephemeral: true
                });
            }
            
            if (interaction.customId.startsWith('rehome_cancel_')) {
                return interaction.update({
                    content: "Pet rehoming cancelled. Your pet is safe with you!",
                    embeds: [],
                    components: []
                });
            }
            
            try {
                let userData = await economySchema.findOne({ 
                    Guild: interaction.guild.id, 
                    User: interaction.user.id 
                });
                
                if (!userData || !userData.Pet || !userData.Pet.id) {
                    return interaction.update({
                        content: "You don't have a pet to rehome.",
                        embeds: [],
                        components: []
                    });
                }
                
                const petDetails = petItems.getPetById(userData.Pet.id);
                const petName = userData.Pet.name || (petDetails ? petDetails.name : "Unknown Pet");
                
                userData.Pet = {
                    id: null,
                    name: null,
                    type: null,
                    emoji: null,
                    happiness: 100,
                    hunger: 100,
                    purchasedAt: null,
                    lastFed: null,
                    lastWalked: null
                };
                
                await userData.save();
                
                return interaction.update({
                    content: `You have rehomed ${petName}. They're now living happily with their new family.`,
                    embeds: [],
                    components: []
                });
                
            } catch (error) {
                console.error("Pet rehome error:", error);
                return interaction.update({
                    content: "An error occurred while rehoming your pet.",
                    embeds: [],
                    components: []
                });
            }
        }
    }
};

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
