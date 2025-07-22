const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economySchema = require('../../schemas/economySchema');
const shopItems = require('../../utils/economyUtils/items/shopItems');

module.exports = {
    usableInDms: false,
    category: "Economy",
    data: new SlashCommandBuilder()
        .setName('use')
        .setDescription('Use an item from your inventory')
        .addStringOption(option => 
            option.setName('item')
                .setDescription('Item to use')
                .setRequired(true)
                .setAutocomplete(true)),
        
    async execute(interaction, client) {
        const { guild, user } = interaction;
        const itemInput = interaction.options.getString('item');
        
        let data = await economySchema.findOne({ Guild: guild.id, User: user.id });
        
        if (!data) {
            return interaction.reply({
                content: "You don't have an economy account yet. Create one using `/economy create`!",
                ephemeral: true
            });
        }
        
        if (!data.Inventory || data.Inventory.length === 0) {
            return interaction.reply({
                content: "You don't have any items in your inventory. Visit `/shop items` to buy some!",
                ephemeral: true
            });
        }
        
        const inventoryItem = data.Inventory.find(item => item.id === itemInput);
        
        if (!inventoryItem) {
            return interaction.reply({
                content: "You don't have that item in your inventory.",
                ephemeral: true
            });
        }
        
        const shopItem = shopItems.items.find(item => item.id === itemInput);
        
        if (!shopItem) {
            return interaction.reply({
                content: "This item no longer exists in the shop.",
                ephemeral: true
            });
        }

        if (!shopItem.usable) {
            return interaction.reply({
                content: `The ${shopItem.name} is not a usable item.`,
                ephemeral: true
            });
        }

        let result;
        
        switch (shopItem.id) {
            case 'fishing_rod':
                result = handleFishing(data);
                break;
                
            case 'hunting_rifle':
                result = handleHunting(data);
                break;
                
            case 'bank_upgrade':
                result = handleBankUpgrade(data);
                break;
                
            default:
                return interaction.reply({
                    content: `This item has no use implementation.`,
                    ephemeral: true
                });
        }
        
        if (result.consumed) {
            data.Inventory = data.Inventory.filter((item, index) => {
                if (item.id === itemInput) {
                    return false; 
                }
                return true;
            });
        }
        
        if (result.walletChange) data.Wallet += result.walletChange;
        if (result.bankChange) data.Bank += result.bankChange;
        
        await data.save();
        
        const embed = new EmbedBuilder()
            .setColor(client.config.embedEconomyColor || '#00FF00')
            .setTitle(`${shopItem.emoji} Item Used: ${shopItem.name}`)
            .setDescription(result.message)
            .setFooter({ text: `${guild.name} Economy`, iconURL: guild.iconURL() })
            .setTimestamp();
            
        if (result.walletChange || result.bankChange) {
            embed.addFields(
                { name: '💰 Wallet', value: `$${data.Wallet.toLocaleString()}`, inline: true },
                { name: '🏦 Bank', value: `$${data.Bank.toLocaleString()}`, inline: true }
            );
        }
        
        return interaction.reply({ embeds: [embed] });
    }
};

function handleFishing(data) {
    const catches = [
        { name: "Boot", value: 5, chance: 30 },
        { name: "Seaweed", value: 10, chance: 25 },
        { name: "Small Fish", value: 50, chance: 20 },
        { name: "Medium Fish", value: 100, chance: 15 },
        { name: "Large Fish", value: 200, chance: 8 },
        { name: "Rare Fish", value: 500, chance: 2 }
    ];

    const rand = Math.random() * 100;
    let cumulativeChance = 0;
    let caught = catches[0];
    
    for (const fish of catches) {
        cumulativeChance += fish.chance;
        if (rand <= cumulativeChance) {
            caught = fish;
            break;
        }
    }
    
    return {
        consumed: false, 
        walletChange: caught.value,
        message: `You went fishing and caught a **${caught.name}**!\nYou sold it for **$${caught.value}**, which has been added to your wallet.`
    };
}

function handleHunting(data) {
    const catches = [
        { name: "Nothing", value: 0, chance: 30 },
        { name: "Rabbit", value: 75, chance: 25 },
        { name: "Fox", value: 150, chance: 20 },
        { name: "Deer", value: 300, chance: 15 },
        { name: "Bear", value: 750, chance: 8 },
        { name: "Legendary Creature", value: 1500, chance: 2 }
    ];
    
    // Determine catch based on chance
    const rand = Math.random() * 100;
    let cumulativeChance = 0;
    let caught = catches[0];
    
    for (const animal of catches) {
        cumulativeChance += animal.chance;
        if (rand <= cumulativeChance) {
            caught = animal;
            break;
        }
    }
    
    if (caught.name === "Nothing") {
        return {
            consumed: false,
            message: `You went hunting but didn't catch anything. Better luck next time!`
        };
    } else {
        return {
            consumed: false,
            walletChange: caught.value,
            message: `You went hunting and caught a **${caught.name}**!\nYou sold it for **$${caught.value}**, which has been added to your wallet.`
        };
    }
}

function handleBankUpgrade(data) {
    const upgradeAmount = 5000;
    
    return {
        consumed: true,
        bankChange: upgradeAmount,
        message: `You've upgraded your bank account!\nYour bank balance has been increased by **$${upgradeAmount.toLocaleString()}**.`
    };
}
