const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const economySchema = require('../../schemas/economySchema');
const shopItems = require('../../utils/economyUtils/items/shopItems');

module.exports = {
    usableInDms: false,
    category: "Economy",
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('View your inventory items')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('User whose inventory to view (defaults to you)')
                .setRequired(false)),
        
    async execute(interaction, client) {
        const { guild } = interaction;
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
        
        if (!data.Inventory || data.Inventory.length === 0) {
            return interaction.reply({
                content: isSelf 
                    ? "You don't have any items in your inventory. Visit `/shop items` to buy some!"
                    : `${targetUser.username} doesn't have any items in their inventory.`,
                ephemeral: true
            });
        }

        const categories = {};
        data.Inventory.forEach(item => {
            const fullItem = shopItems.items.find(i => i.id === item.id);
            if (!fullItem) return;
            
            if (!categories[fullItem.category]) {
                categories[fullItem.category] = [];
            }
            categories[fullItem.category].push({
                ...item,
                ...fullItem
            });
        });

        const embeds = [];
        
        for (const [category, items] of Object.entries(categories)) {
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

            const itemCounts = {};
            items.forEach(item => {
                if (!itemCounts[item.id]) {
                    itemCounts[item.id] = {
                        count: 0,
                        name: item.name,
                        emoji: item.emoji,
                        description: item.description,
                        price: item.price,
                        usable: item.usable
                    };
                }
                itemCounts[item.id].count++;
            });

            const itemList = Object.values(itemCounts).map(item => 
                `${item.emoji} **${item.name}** (x${item.count}) - ${item.usable ? '✅ Usable' : '❌ Not Usable'}\n` +
                `└ ${item.description.substring(0, 80)}${item.description.length > 80 ? '...' : ''}`
            ).join('\n\n');
            
            const embed = new EmbedBuilder()
                .setColor(client.config.embedEconomyColor || '#00FF00')
                .setTitle(`${targetUser.username}'s ${categoryName} Items`)
                .setDescription(itemList)
                .setFooter({ text: `${guild.name} Economy • Category: ${categoryName}`, iconURL: guild.iconURL() })
                .setTimestamp();
                
            embeds.push(embed);
        }

        if (data.House) {
            const house = shopItems.houses.find(h => h.id === data.House.id);
            
            if (house) {
                const houseEmbed = new EmbedBuilder()
                    .setColor(client.config.embedEconomyColor || '#00FF00')
                    .setTitle(`${targetUser.username}'s Property`)
                    .setDescription(`${house.emoji} **${house.name}**\n${house.description}\n\n💰 Daily Income: $${house.income.toLocaleString()}\n💵 Value: $${Math.floor(house.price * 0.75).toLocaleString()} (75% of original price)`)
                    .setFooter({ text: `${guild.name} Economy • Category: Property`, iconURL: guild.iconURL() })
                    .setTimestamp();
                    
                embeds.push(houseEmbed);
            }
        }
        
        if (data.Businesses && data.Businesses.length > 0) {
            const businessItems = data.Businesses.map(business => {
                const fullBusiness = shopItems.businesses.find(b => b.id === business.id);
                return fullBusiness ? {
                    ...business,
                    ...fullBusiness
                } : null;
            }).filter(Boolean);
            
            if (businessItems.length > 0) {
                const businessList = businessItems.map(business => 
                    `${business.emoji} **${business.name}**\n` +
                    `└ ${business.description}\n` +
                    `└ 💰 Daily Income: $${business.income.toLocaleString()}`
                ).join('\n\n');
                
                const businessEmbed = new EmbedBuilder()
                    .setColor(client.config.embedEconomyColor || '#00FF00')
                    .setTitle(`${targetUser.username}'s Businesses`)
                    .setDescription(businessList)
                    .setFooter({ text: `${guild.name} Economy • Category: Businesses`, iconURL: guild.iconURL() })
                    .setTimestamp();
                    
                embeds.push(businessEmbed);
            }
        }

        if (data.Job && data.Job !== "Unemployed") {
            const job = shopItems.jobs.find(j => j.id === data.Job);
            
            if (job) {
                const jobEmbed = new EmbedBuilder()
                    .setColor(client.config.embedEconomyColor || '#00FF00')
                    .setTitle(`${targetUser.username}'s Job`)
                    .setDescription(`${job.emoji} **${job.name}** (Level ${data.JobLevel})\n${job.description}\n\n💰 Base Pay: $${job.basePay.toLocaleString()} per hour\n⭐ Level Bonus: $${data.JobLevel * 50} per hour`)
                    .setFooter({ text: `${guild.name} Economy • Category: Job`, iconURL: guild.iconURL() })
                    .setTimestamp();
                    
                embeds.push(jobEmbed);
            }
        }

        if (embeds.length === 0) {
            return interaction.reply({
                content: isSelf 
                    ? "You don't have any items in your inventory. Visit `/shop items` to buy some!"
                    : `${targetUser.username} doesn't have any items in their inventory.`,
                ephemeral: true
            });
        } else if (embeds.length === 1) {
            return interaction.reply({ embeds: [embeds[0]] });
        } else {
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('inventory_prev')
                    .setLabel('◀️ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('inventory_next')
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(embeds.length <= 1)
            );

            embeds[0].setFooter({ 
                text: `${guild.name} Economy • Page 1/${embeds.length}`, 
                iconURL: guild.iconURL() 
            });

            return interaction.reply({ 
                embeds: [embeds[0]], 
                components: [buttons],
                fetchReply: true
            });
        }
    }
};
