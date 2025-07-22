const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const economySchema = require('../../schemas/economySchema');
const shopItems = require('../../utils/economyUtils/items/shopItems');
const petItems = require('../../utils/economyUtils/items/petItems');

module.exports = {
    usableInDms: false,
    category: "Economy",
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Browse available items, houses, businesses, and pets')
        .addSubcommand(subcommand => 
            subcommand.setName('items')
            .setDescription('Browse items to purchase'))
        .addSubcommand(subcommand => 
            subcommand.setName('houses')
            .setDescription('Browse houses to purchase'))
        .addSubcommand(subcommand => 
            subcommand.setName('businesses')
            .setDescription('Browse businesses to purchase'))
        .addSubcommand(subcommand => 
            subcommand.setName('jobs')
            .setDescription('Browse available jobs'))
        .addSubcommand(subcommand =>
            subcommand.setName('pets')
            .setDescription('Browse pets available for adoption')),
            
    async execute(interaction, client) {
        const { guild, user, options } = interaction;
        const subcommand = options.getSubcommand();
        
        let data = await economySchema.findOne({ Guild: guild.id, User: user.id });
        
        if (!data) {
            return interaction.reply({
                content: "You don't have an economy account yet. Create one using `/economy create`!",
                ephemeral: true
            });
        }
        
        data.CommandsRan += 1;
        await data.save();
        
        let embed = new EmbedBuilder()
            .setColor(client.config.embedEconomyColor || '#00FF00')
            .setFooter({ text: `${guild.name} Economy Shop`, iconURL: guild.iconURL() })
            .setTimestamp();
            
        let components = [];
        
        if (subcommand === 'items') {
            embed
                .setTitle('🛒 Item Shop')
                .setDescription('Browse and purchase items to use in the economy. Select an item from the menu to view details and purchase options.')
                .addFields(
                    { name: 'Your Balance', value: `💵 Cash: $${data.Wallet.toLocaleString()}\n🏦 Bank: $${data.Bank.toLocaleString()}`, inline: false }
                );
                
            const itemOptions = shopItems.items.map(item => ({
                label: `${item.name} - $${item.price.toLocaleString()}`,
                description: item.description.substring(0, 100),
                value: item.id,
                emoji: item.emoji
            }));
            
            const selectMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('shop_select_item')
                    .setPlaceholder('Select an item to view details')
                    .addOptions(itemOptions)
            );
            
            components.push(selectMenu);
            
        } else if (subcommand === 'houses') {
            embed
                .setTitle('🏡 Housing Market')
                .setDescription('Browse and purchase properties. Houses generate passive income every day.')
                .addFields(
                    { name: 'Your Balance', value: `💵 Cash: $${data.Wallet.toLocaleString()}\n🏦 Bank: $${data.Bank.toLocaleString()}`, inline: false }
                );
                
            if (data.House) {
                const currentHouse = shopItems.houses.find(h => h.id === data.House.id);
                embed.addFields(
                    { name: 'Your Current House', value: `${currentHouse.emoji} ${currentHouse.name}\nDaily Income: $${currentHouse.income.toLocaleString()}`, inline: false }
                );
            }
            
            const houseOptions = shopItems.houses.map(house => ({
                label: `${house.name} - $${house.price.toLocaleString()}`,
                description: `Daily income: $${house.income.toLocaleString()}`,
                value: house.id,
                emoji: house.emoji
            }));
            
            const selectMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('shop_select_house')
                    .setPlaceholder('Select a house to view details')
                    .addOptions(houseOptions)
            );
            
            components.push(selectMenu);
            
        } else if (subcommand === 'businesses') {
            embed
                .setTitle('💼 Business Marketplace')
                .setDescription('Invest in businesses that generate passive income every day.')
                .addFields(
                    { name: 'Your Balance', value: `💵 Cash: $${data.Wallet.toLocaleString()}\n🏦 Bank: $${data.Bank.toLocaleString()}`, inline: false }
                );
                
            if (data.Businesses && data.Businesses.length > 0) {
                const businessListText = data.Businesses.map(business => {
                    const businessInfo = shopItems.businesses.find(b => b.id === business.id);
                    return `${businessInfo.emoji} ${businessInfo.name} - Daily Income: $${businessInfo.income.toLocaleString()}`;
                }).join('\n');
                
                embed.addFields(
                    { name: 'Your Businesses', value: businessListText, inline: false }
                );
            }
            
            const businessOptions = shopItems.businesses.map(business => ({
                label: `${business.name} - $${business.price.toLocaleString()}`,
                description: `Daily income: $${business.income.toLocaleString()}`,
                value: business.id,
                emoji: business.emoji
            }));
            
            const selectMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('shop_select_business')
                    .setPlaceholder('Select a business to view details')
                    .addOptions(businessOptions)
            );
            
            components.push(selectMenu);
            
        } else if (subcommand === 'jobs') {
            embed
                .setTitle('💼 Job Listings')
                .setDescription('Browse available jobs. Some jobs require specific items to qualify.')
                .addFields(
                    { name: 'Your Current Job', value: data.Job !== "Unemployed" ? 
                        `${shopItems.jobs.find(job => job.id === data.Job).emoji} ${shopItems.jobs.find(job => job.id === data.Job).name} (Level ${data.JobLevel})` : 
                        "Unemployed (Use `/work` to freelance)", 
                        inline: false }
                );

            const jobOptions = shopItems.jobs.map(job => {
                const meetsRequirements = job.requirements.length === 0 || 
                    job.requirements.every(req => data.Inventory.some(item => item.id === req));
                
                return {
                    label: `${job.name} - $${job.basePay}/hr`,
                    description: meetsRequirements ? job.description : 'Requirements not met',
                    value: job.id,
                    emoji: job.emoji,
                    default: data.Job === job.id
                };
            });
            
            const selectMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('shop_select_job')
                    .setPlaceholder('Select a job to view details')
                    .addOptions(jobOptions)
            );
            
            components.push(selectMenu);
        } else if (subcommand === 'pets') {
            embed
                .setTitle('🐾 Pet Adoption Center')
                .setDescription('Browse and adopt pets. Each pet has different benefits and requirements.')
                .addFields(
                    { name: 'Your Balance', value: `💵 Cash: $${data.Wallet.toLocaleString()}\n🏦 Bank: $${data.Bank.toLocaleString()}`, inline: false }
                );
                
            if (data.Pet && data.Pet.id) {
                const currentPet = petItems.getPetById(data.Pet.id);
                if (currentPet) {
                    const petName = data.Pet.name || currentPet.name;
                    embed.addFields(
                        { name: 'Your Current Pet', value: `${currentPet.emoji} ${petName} (${currentPet.rarity})\nDaily Income Bonus: +$${currentPet.incomeBonus}`, inline: false }
                    );
                }
            }
            
            const petCategoryOptions = [
                { 
                    label: `${shopItems.pets.common.name} ($1,000-$5,000)`,
                    description: shopItems.pets.common.description,
                    value: 'pet_category_common',
                    emoji: shopItems.pets.common.emoji
                },
                { 
                    label: `${shopItems.pets.uncommon.name} ($7,500-$15,000)`,
                    description: shopItems.pets.uncommon.description,
                    value: 'pet_category_uncommon',
                    emoji: shopItems.pets.uncommon.emoji
                },
                { 
                    label: `${shopItems.pets.rare.name} ($20,000-$50,000)`,
                    description: shopItems.pets.rare.description,
                    value: 'pet_category_rare',
                    emoji: shopItems.pets.rare.emoji
                },
                { 
                    label: `${shopItems.pets.epic.name} ($75,000-$150,000)`,
                    description: shopItems.pets.epic.description,
                    value: 'pet_category_epic',
                    emoji: shopItems.pets.epic.emoji
                },
                { 
                    label: `${shopItems.pets.legendary.name} ($200,000+)`,
                    description: shopItems.pets.legendary.description,
                    value: 'pet_category_legendary',
                    emoji: shopItems.pets.legendary.emoji
                }
            ];
            
            const selectMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('shop_pet_category')
                    .setPlaceholder('Select a pet category')
                    .addOptions(petCategoryOptions)
            );
            
            components.push(selectMenu);
        }
        
        const navButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('shop_nav_items')
                .setLabel('Items')
                .setStyle(subcommand === 'items' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setEmoji('🛒'),
            new ButtonBuilder()
                .setCustomId('shop_nav_houses')
                .setLabel('Houses')
                .setStyle(subcommand === 'houses' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setEmoji('🏡'),
            new ButtonBuilder()
                .setCustomId('shop_nav_businesses')
                .setLabel('Businesses')
                .setStyle(subcommand === 'businesses' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setEmoji('💼'),
            new ButtonBuilder()
                .setCustomId('shop_nav_jobs')
                .setLabel('Jobs')
                .setStyle(subcommand === 'jobs' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setEmoji('👔')
        );
        
        const petButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('shop_nav_pets')
                .setLabel('Pets')
                .setStyle(subcommand === 'pets' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setEmoji('🐾')
        );
        
        components.push(navButtons);
        components.push(petButton);
        
        await interaction.reply({ embeds: [embed], components });
    }
};
