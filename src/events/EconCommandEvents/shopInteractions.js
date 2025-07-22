const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const economySchema = require('../../schemas/economySchema');
const shopItems = require('../../utils/economyUtils/items/shopItems');
const petItems = require('../../utils/economyUtils/items/petItems');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
        if (!interaction.customId.startsWith('shop_')) return;
        
        try {
            const userData = await economySchema.findOne({ 
                Guild: interaction.guild.id, 
                User: interaction.user.id 
            });
            
            if (!userData) {
                return interaction.reply({
                    content: "You don't have an economy account. Please create one using `/economy create`.",
                    ephemeral: true
                });
            }

            if (interaction.customId === 'shop_nav_items' || 
                interaction.customId === 'shop_nav_houses' || 
                interaction.customId === 'shop_nav_businesses' || 
                interaction.customId === 'shop_nav_jobs' ||
                interaction.customId === 'shop_nav_pets') {
                
                let section = 'items';
                if (interaction.customId === 'shop_nav_houses') section = 'houses';
                if (interaction.customId === 'shop_nav_businesses') section = 'businesses';
                if (interaction.customId === 'shop_nav_jobs') section = 'jobs';
                if (interaction.customId === 'shop_nav_pets') section = 'pets';
                
                let embed = new EmbedBuilder()
                    .setColor(client.config.embedEconomyColor || '#00FF00')
                    .setFooter({ text: `${interaction.guild.name} Economy Shop`, iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                    
                let components = [];
                
                if (section === 'items') {
                    embed
                        .setTitle('🛒 Item Shop')
                        .setDescription('Browse and purchase items to use in the economy. Select an item from the menu to view details and purchase options.')
                        .addFields(
                            { name: 'Your Balance', value: `💵 Cash: $${userData.Wallet.toLocaleString()}\n🏦 Bank: $${userData.Bank.toLocaleString()}`, inline: false }
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
                    
                } else if (section === 'houses') {
                    embed
                        .setTitle('🏡 Housing Market')
                        .setDescription('Browse and purchase properties. Houses generate passive income every day.')
                        .addFields(
                            { name: 'Your Balance', value: `💵 Cash: $${userData.Wallet.toLocaleString()}\n🏦 Bank: $${userData.Bank.toLocaleString()}`, inline: false }
                        );
                        
                    if (userData.House) {
                        const currentHouse = shopItems.houses.find(h => h.id === userData.House.id);
                        if (currentHouse) {
                            embed.addFields(
                                { name: 'Your Current House', value: `${currentHouse.emoji} ${currentHouse.name}\nDaily Income: $${currentHouse.income.toLocaleString()}`, inline: false }
                            );
                        }
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
                    
                } else if (section === 'businesses') {
                    embed
                        .setTitle('💼 Business Marketplace')
                        .setDescription('Invest in businesses that generate passive income every day.')
                        .addFields(
                            { name: 'Your Balance', value: `💵 Cash: $${userData.Wallet.toLocaleString()}\n🏦 Bank: $${userData.Bank.toLocaleString()}`, inline: false }
                        );
                        
                    if (userData.Businesses && userData.Businesses.length > 0) {
                        const businessListText = userData.Businesses.map(business => {
                            const businessInfo = shopItems.businesses.find(b => b.id === business.id);
                            if (!businessInfo) return null;
                            return `${businessInfo.emoji} ${businessInfo.name} - Daily Income: $${businessInfo.income.toLocaleString()}`;
                        }).filter(Boolean).join('\n');
                        
                        if (businessListText) {
                            embed.addFields(
                                { name: 'Your Businesses', value: businessListText, inline: false }
                            );
                        }
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
                    
                } else if (section === 'jobs') {
                    embed
                        .setTitle('💼 Job Listings')
                        .setDescription('Browse available jobs. Some jobs require specific items to qualify.')
                        .addFields(
                            { name: 'Your Current Job', value: userData.Job !== "Unemployed" ? 
                                `${shopItems.jobs.find(job => job.id === userData.Job)?.emoji || '💼'} ${shopItems.jobs.find(job => job.id === userData.Job)?.name || 'Unknown Job'} (Level ${userData.JobLevel})` : 
                                "Unemployed (Use `/work` to freelance)", 
                                inline: false }
                        );
                        
                    const jobOptions = shopItems.jobs.map(job => {
                        const meetsRequirements = job.requirements.length === 0 || 
                            job.requirements.every(req => userData.Inventory.some(item => item.id === req));
                        
                        return {
                            label: `${job.name} - $${job.basePay}/hr`,
                            description: meetsRequirements ? job.description : 'Requirements not met',
                            value: job.id,
                            emoji: job.emoji,
                            default: userData.Job === job.id
                        };
                    });
                    
                    const selectMenu = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('shop_select_job')
                            .setPlaceholder('Select a job to view details')
                            .addOptions(jobOptions)
                    );
                    
                    components.push(selectMenu);
                } else if (section === 'pets') {
                    embed
                        .setTitle('🐾 Pet Adoption Center')
                        .setDescription('Browse and adopt pets. Each pet has different benefits and requirements.')
                        .addFields(
                            { name: 'Your Balance', value: `💵 Cash: $${userData.Wallet.toLocaleString()}\n🏦 Bank: $${userData.Bank.toLocaleString()}`, inline: false }
                        );
                        
                    if (userData.Pet && userData.Pet.id) {
                        const currentPet = petItems.getPetById(userData.Pet.id);
                        if (currentPet) {
                            const petName = userData.Pet.name || currentPet.name;
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
                        .setStyle(section === 'items' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setEmoji('🛒'),
                    new ButtonBuilder()
                        .setCustomId('shop_nav_houses')
                        .setLabel('Houses')
                        .setStyle(section === 'houses' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setEmoji('🏡'),
                    new ButtonBuilder()
                        .setCustomId('shop_nav_businesses')
                        .setLabel('Businesses')
                        .setStyle(section === 'businesses' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setEmoji('💼'),
                    new ButtonBuilder()
                        .setCustomId('shop_nav_jobs')
                        .setLabel('Jobs')
                        .setStyle(section === 'jobs' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setEmoji('👔')
                );
                
                const petButton = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('shop_nav_pets')
                        .setLabel('Pets')
                        .setStyle(section === 'pets' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setEmoji('🐾')
                );
                
                components.push(navButtons);
                components.push(petButton);
                
                return interaction.update({ embeds: [embed], components });
            }
            
            if (interaction.customId === 'shop_pet_category') {
                const categoryValue = interaction.values[0];
                const category = categoryValue.replace('pet_category_', '');
                
                if (!petItems[category]) {
                    return interaction.reply({
                        content: "Invalid pet category selected.",
                        ephemeral: true
                    });
                }
                
                const petsInCategory = petItems[category];
                
                const embed = new EmbedBuilder()
                    .setColor(client.config.embedEconomyColor || '#00FF00')
                    .setTitle(`${shopItems.pets[category].emoji} ${shopItems.pets[category].name}`)
                    .setDescription(shopItems.pets[category].description)
                    .addFields(
                        { name: 'Your Balance', value: `💵 Cash: $${userData.Wallet.toLocaleString()}\n🏦 Bank: $${userData.Bank.toLocaleString()}`, inline: false }
                    )
                    .setFooter({ text: `${interaction.guild.name} Economy Shop`, iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                
                const petOptions = petsInCategory.map(pet => ({
                    label: `${pet.name} - $${pet.price.toLocaleString()}`,
                    description: `Income Bonus: +$${pet.incomeBonus}/day, Feed Cost: $${pet.feedCost}`,
                    value: `pet_${pet.id}`,
                    emoji: pet.emoji
                }));
                
                const selectMenu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('shop_select_pet')
                        .setPlaceholder('Select a pet to view details')
                        .addOptions(petOptions)
                );
                
                const backButton = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('shop_nav_pets')
                        .setLabel('Back to Pet Categories')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⬅️')
                );
                
                return interaction.update({ embeds: [embed], components: [selectMenu, backButton] });
            }
            
            if (interaction.customId === 'shop_select_pet') {
                const petId = interaction.values[0].replace('pet_', '');
                const pet = petItems.getPetById(petId);
                
                if (!pet) {
                    return interaction.reply({
                        content: "This pet is no longer available for adoption.",
                        ephemeral: true
                    });
                }
                
                const alreadyHasPet = userData.Pet && userData.Pet.id;
                
                const embed = new EmbedBuilder()
                    .setColor(client.config.embedEconomyColor || '#00FF00')
                    .setTitle(`${pet.emoji} ${pet.name}`)
                    .setDescription(pet.description)
                    .addFields(
                        { name: 'Price', value: `$${pet.price.toLocaleString()}`, inline: true },
                        { name: 'Rarity', value: pet.rarity, inline: true },
                        { name: 'Your Balance', value: `$${userData.Wallet.toLocaleString()}`, inline: true },
                        { name: '💰 Daily Income Bonus', value: `+$${pet.incomeBonus.toLocaleString()}`, inline: true },
                        { name: '🍖 Feed Cost', value: `$${pet.feedCost.toLocaleString()}`, inline: true },
                        { name: '😊 Happiness Boost', value: `+${pet.happinessBoost} points`, inline: true }
                    )
                    .setFooter({ text: `${interaction.guild.name} Economy Shop`, iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                
                const buttons = new ActionRowBuilder();
                
                if (alreadyHasPet) {
                    embed.addFields(
                        { name: '⚠️ Warning', value: 'You already have a pet. Adopting a new one will replace your current pet.', inline: false }
                    );
                }
                
                buttons.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`shop_adopt_pet_${petId}`)
                        .setLabel(alreadyHasPet ? `Replace & Adopt for $${pet.price.toLocaleString()}` : `Adopt for $${pet.price.toLocaleString()}`)
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(userData.Wallet < pet.price)
                );
                
                if (userData.Wallet < pet.price) {
                    buttons.addComponents(
                        new ButtonBuilder()
                            .setCustomId('shop_nav_pets')
                            .setLabel('Back to Pets')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('⬅️')
                    );
                }
                
                return interaction.update({ embeds: [embed], components: [buttons] });
            }
            
            if (interaction.customId.startsWith('shop_adopt_pet_')) {
                const petId = interaction.customId.replace('shop_adopt_pet_', '');
                const pet = petItems.getPetById(petId);
                
                if (!pet) {
                    return interaction.reply({
                        content: "This pet is no longer available for adoption.",
                        ephemeral: true
                    });
                }
                
                if (userData.Wallet < pet.price) {
                    return interaction.reply({
                        content: `You don't have enough money to adopt this pet. You need $${pet.price.toLocaleString()}, but you only have $${userData.Wallet.toLocaleString()}.`,
                        ephemeral: true
                    });
                }
                
                const hadPet = userData.Pet && userData.Pet.id;
                const oldPetName = hadPet ? (userData.Pet.name || petItems.getPetById(userData.Pet.id)?.name || "Unknown Pet") : null;
                
                userData.Pet = {
                    id: pet.id,
                    name: pet.name,
                    type: pet.rarity.toLowerCase(),
                    emoji: pet.emoji,
                    happiness: 100,
                    hunger: 100,
                    purchasedAt: new Date(),
                    lastFed: new Date(),
                    lastWalked: new Date()
                };
                
                userData.Wallet -= pet.price;
                
                await userData.save();
                
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle(`${pet.emoji} New Pet Adopted!`)
                    .setDescription(`You've successfully adopted a ${pet.name} for $${pet.price.toLocaleString()}!`)
                    .addFields(
                        { name: '💰 New Balance', value: `$${userData.Wallet.toLocaleString()}`, inline: true },
                        { name: '📈 Daily Income Bonus', value: `+$${pet.incomeBonus.toLocaleString()}`, inline: true }
                    )
                    .setFooter({ text: `Use /pet status to view and interact with your new pet` })
                    .setTimestamp();
                    
                if (hadPet) {
                    embed.addFields(
                        { name: 'Previous Pet', value: `${oldPetName} has been rehomed to make space for your new pet.`, inline: false }
                    );
                }
                
                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`pet_check_${pet.id}`)
                        .setLabel('View Pet Status')
                        .setStyle(ButtonStyle.Primary)
                );
                
                return interaction.update({ embeds: [embed], components: [buttons] });
            }
            
            if (interaction.customId.startsWith('pet_check_')) {
                return;
            }
            
            if (interaction.customId === 'shop_select_item') {
                const itemId = interaction.values[0];
                const item = shopItems.items.find(i => i.id === itemId);
                
                if (!item) {
                    return interaction.reply({
                        content: "This item no longer exists in the shop.",
                        ephemeral: true
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(client.config.embedEconomyColor || '#00FF00')
                    .setTitle(`${item.emoji} ${item.name}`)
                    .setDescription(item.description)
                    .addFields(
                        { name: 'Price', value: `$${item.price.toLocaleString()}`, inline: true },
                        { name: 'Category', value: item.category.charAt(0).toUpperCase() + item.category.slice(1), inline: true },
                        { name: 'Your Balance', value: `$${userData.Wallet.toLocaleString()}`, inline: true }
                    )
                    .setFooter({ text: `${interaction.guild.name} Economy`, iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                    
                const buttons = new ActionRowBuilder();
                
                buttons.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`shop_buy_item_${itemId}`)
                        .setLabel(`Buy 1 for $${item.price.toLocaleString()}`)
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(userData.Wallet < item.price)
                );
                
                if (userData.Wallet < item.price) {
                    buttons.addComponents(
                        new ButtonBuilder()
                            .setCustomId('shop_nav_items')
                            .setLabel('Back to Shop')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('⬅️')
                    );
                }
                
                return interaction.update({ embeds: [embed], components: [buttons] });
            }
            
            if (interaction.customId === 'shop_select_house') {
                const houseId = interaction.values[0];
                const house = shopItems.houses.find(h => h.id === houseId);
                
                if (!house) {
                    return interaction.reply({
                        content: "This house is no longer available in the shop.",
                        ephemeral: true
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(client.config.embedEconomyColor || '#00FF00')
                    .setTitle(`${house.emoji} ${house.name}`)
                    .setDescription(house.description)
                    .addFields(
                        { name: 'Price', value: `$${house.price.toLocaleString()}`, inline: true },
                        { name: 'Daily Income', value: `$${house.income.toLocaleString()}`, inline: true },
                        { name: 'Your Balance', value: `$${userData.Wallet.toLocaleString()}`, inline: true }
                    )
                    .setFooter({ text: `${interaction.guild.name} Economy`, iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                
                const currentHouse = userData.House ? shopItems.houses.find(h => h.id === userData.House.id) : null;
                
                const buttons = new ActionRowBuilder();
                
                buttons.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`shop_buy_house_${houseId}`)
                        .setLabel(`Buy for $${house.price.toLocaleString()}`)
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(userData.Wallet < house.price)
                );
                
                if (userData.Wallet < house.price) {
                    buttons.addComponents(
                        new ButtonBuilder()
                            .setCustomId('shop_nav_houses')
                            .setLabel('Back to Houses')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('⬅️')
                    );
                }
                
                if (currentHouse) {
                    embed.addFields(
                        { name: 'Your Current House', value: `${currentHouse.emoji} ${currentHouse.name} (Value: $${Math.floor(currentHouse.price * 0.75).toLocaleString()})`, inline: false },
                        { name: '⚠️ Warning', value: 'Buying a new house will replace your current one. You will receive 75% of your current house\'s value.', inline: false }
                    );
                }
                
                return interaction.update({ embeds: [embed], components: [buttons] });
            }
            
            if (interaction.customId === 'shop_select_business') {
                const businessId = interaction.values[0];
                const business = shopItems.businesses.find(b => b.id === businessId);
                
                if (!business) {
                    return interaction.reply({
                        content: "This business is no longer available in the shop.",
                        ephemeral: true
                    });
                }
                
                const alreadyOwned = userData.Businesses && userData.Businesses.some(b => b.id === businessId);
                
                const embed = new EmbedBuilder()
                    .setColor(client.config.embedEconomyColor || '#00FF00')
                    .setTitle(`${business.emoji} ${business.name}`)
                    .setDescription(business.description)
                    .addFields(
                        { name: 'Price', value: `$${business.price.toLocaleString()}`, inline: true },
                        { name: 'Daily Income', value: `$${business.income.toLocaleString()}`, inline: true },
                        { name: 'Your Balance', value: `$${userData.Wallet.toLocaleString()}`, inline: true }
                    )
                    .setFooter({ text: `${interaction.guild.name} Economy`, iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                    
                const buttons = new ActionRowBuilder();
                
                buttons.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`shop_buy_business_${businessId}`)
                        .setLabel(alreadyOwned ? 'Already Owned' : `Buy for $${business.price.toLocaleString()}`)
                        .setStyle(alreadyOwned ? ButtonStyle.Secondary : ButtonStyle.Success)
                        .setDisabled(alreadyOwned || userData.Wallet < business.price)
                );
                
                if (alreadyOwned || userData.Wallet < business.price) {
                    buttons.addComponents(
                        new ButtonBuilder()
                            .setCustomId('shop_nav_businesses')
                            .setLabel('Back to Businesses')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('⬅️')
                    );
                }
                
                return interaction.update({ embeds: [embed], components: [buttons] });
            }
            
            if (interaction.customId === 'shop_select_job') {
                const jobId = interaction.values[0];
                const job = shopItems.jobs.find(j => j.id === jobId);
                
                if (!job) {
                    return interaction.reply({
                        content: "This job is no longer available.",
                        ephemeral: true
                    });
                }
                
                const hasRequirements = job.requirements.length === 0 || 
                    job.requirements.every(req => userData.Inventory.some(item => item.id === req));
                
                const embed = new EmbedBuilder()
                    .setColor(client.config.embedEconomyColor || '#00FF00')
                    .setTitle(`${job.emoji} ${job.name}`)
                    .setDescription(job.description)
                    .addFields(
                        { name: 'Base Pay', value: `$${job.basePay.toLocaleString()} per hour`, inline: true },
                        { name: 'Your Current Job', value: userData.Job !== "Unemployed" ? 
                            `${shopItems.jobs.find(j => j.id === userData.Job)?.name || 'Unknown'} (Level ${userData.JobLevel})` : 
                            "Unemployed", 
                            inline: true }
                    )
                    .setFooter({ text: `${interaction.guild.name} Economy`, iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                
                if (job.requirements.length > 0) {
                    const reqItemsText = job.requirements.map(req => {
                        const itemInfo = shopItems.items.find(i => i.id === req);
                        if (!itemInfo) return null;
                        const hasItem = userData.Inventory.some(item => item.id === req);
                        return `${hasItem ? '✅' : '❌'} ${itemInfo.name}`;
                    }).filter(Boolean).join('\n');
                    
                    if (reqItemsText) {
                        embed.addFields(
                            { name: 'Requirements', value: reqItemsText, inline: false }
                        );
                    }
                }
                
                const alreadyHasJob = userData.Job === jobId;
                
                const buttons = new ActionRowBuilder();
                
                buttons.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`shop_take_job_${jobId}`)
                        .setLabel(alreadyHasJob ? 'Current Job' : 'Take This Job')
                        .setStyle(alreadyHasJob ? ButtonStyle.Secondary : ButtonStyle.Success)
                        .setDisabled(alreadyHasJob || !hasRequirements)
                );
                
                if (alreadyHasJob || !hasRequirements) {
                    buttons.addComponents(
                        new ButtonBuilder()
                            .setCustomId('shop_nav_jobs')
                            .setLabel('Back to Jobs')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('⬅️')
                    );
                }
                
                return interaction.update({ embeds: [embed], components: [buttons] });
            }
            
            if (interaction.customId.startsWith('shop_buy_item_')) {
                const itemId = interaction.customId.replace('shop_buy_item_', '');
                const item = shopItems.items.find(i => i.id === itemId);
                
                if (!item) {
                    return interaction.reply({
                        content: "This item is no longer available in the shop.",
                        ephemeral: true
                    });
                }
                
                if (userData.Wallet < item.price) {
                    return interaction.reply({
                        content: `You don't have enough money to buy this item. You need $${item.price.toLocaleString()}, but you only have $${userData.Wallet.toLocaleString()}.`,
                        ephemeral: true
                    });
                }
                
                userData.Inventory.push({
                    id: item.id,
                    name: item.name,
                    emoji: item.emoji,
                    purchasedAt: new Date()
                });
                
                userData.Wallet -= item.price;
                
                await userData.save();
                
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🛍️ Purchase Successful')
                    .setDescription(`You have successfully purchased ${item.emoji} **${item.name}** for $${item.price.toLocaleString()}.`)
                    .addFields(
                        { name: '💰 New Balance', value: `$${userData.Wallet.toLocaleString()}`, inline: true }
                    )
                    .setFooter({ text: `Use /inventory to view your items` })
                    .setTimestamp();
                    
                return interaction.update({ embeds: [embed], components: [] });
            }
            
            if (interaction.customId.startsWith('shop_buy_house_')) {
                const houseId = interaction.customId.replace('shop_buy_house_', '');
                const house = shopItems.houses.find(h => h.id === houseId);
                
                if (!house) {
                    return interaction.reply({
                        content: "This house is no longer available in the shop.",
                        ephemeral: true
                    });
                }
                
                if (userData.Wallet < house.price) {
                    return interaction.reply({
                        content: `You don't have enough money to buy this house. You need $${house.price.toLocaleString()}, but you only have $${userData.Wallet.toLocaleString()}.`,
                        ephemeral: true
                    });
                }
                
                let oldHouseRefund = 0;
                
                if (userData.House) {
                    const oldHouse = shopItems.houses.find(h => h.id === userData.House.id);
                    if (oldHouse) {
                        oldHouseRefund = Math.floor(oldHouse.price * 0.75);
                    }
                }
                
                userData.House = {
                    id: house.id,
                    name: house.name,
                    emoji: house.emoji,
                    purchasedAt: new Date()
                };
                
                userData.Wallet = userData.Wallet - house.price + oldHouseRefund;
                
                await userData.save();
                
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🏡 House Purchase Successful')
                    .setDescription(`You are now the proud owner of a ${house.emoji} **${house.name}**!`)
                    .addFields(
                        { name: '💰 Purchase Price', value: `$${house.price.toLocaleString()}`, inline: true },
                        { name: '💸 Refund from Old House', value: `$${oldHouseRefund.toLocaleString()}`, inline: true },
                        { name: '💵 New Balance', value: `$${userData.Wallet.toLocaleString()}`, inline: true },
                        { name: '💰 Daily Income', value: `$${house.income.toLocaleString()}`, inline: true }
                    )
                    .setFooter({ text: `Income will be automatically added to your bank every day` })
                    .setTimestamp();
                    
                return interaction.update({ embeds: [embed], components: [] });
            }
            
            if (interaction.customId.startsWith('shop_buy_business_')) {
                const businessId = interaction.customId.replace('shop_buy_business_', '');
                const business = shopItems.businesses.find(b => b.id === businessId);
                
                if (!business) {
                    return interaction.reply({
                        content: "This business is no longer available in the shop.",
                        ephemeral: true
                    });
                }
                
                if (userData.Businesses && userData.Businesses.some(b => b.id === businessId)) {
                    return interaction.reply({
                        content: `You already own this business.`,
                        ephemeral: true
                    });
                }
                
                if (userData.Wallet < business.price) {
                    return interaction.reply({
                        content: `You don't have enough money to buy this business. You need $${business.price.toLocaleString()}, but you only have $${userData.Wallet.toLocaleString()}.`,
                        ephemeral: true
                    });
                }
                
                if (!userData.Businesses) userData.Businesses = [];
                
                userData.Businesses.push({
                    id: business.id,
                    name: business.name,
                    emoji: business.emoji,
                    purchasedAt: new Date()
                });
                
                userData.Wallet -= business.price;
                
                await userData.save();
                
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('💼 Business Acquired')
                    .setDescription(`You have successfully purchased ${business.emoji} **${business.name}** for $${business.price.toLocaleString()}.`)
                    .addFields(
                        { name: '💰 New Balance', value: `$${userData.Wallet.toLocaleString()}`, inline: true },
                        { name: '💵 Daily Income', value: `$${business.income.toLocaleString()}`, inline: true }
                    )
                    .setFooter({ text: `Income will be automatically added to your bank every day` })
                    .setTimestamp();
                    
                return interaction.update({ embeds: [embed], components: [] });
            }
            
            if (interaction.customId.startsWith('shop_take_job_')) {
                const jobId = interaction.customId.replace('shop_take_job_', '');
                const job = shopItems.jobs.find(j => j.id === jobId);
                
                if (!job) {
                    return interaction.reply({
                        content: "This job is no longer available.",
                        ephemeral: true
                    });
                }
                
                if (userData.Job === jobId) {
                    return interaction.reply({
                        content: `You already work as a ${job.name}.`,
                        ephemeral: true
                    });
                }
                
                const hasRequirements = job.requirements.length === 0 || 
                    job.requirements.every(req => userData.Inventory.some(item => item.id === req));
                
                if (!hasRequirements) {
                    const missingItems = job.requirements
                        .filter(req => !userData.Inventory.some(item => item.id === req))
                        .map(req => {
                            const item = shopItems.items.find(i => i.id === req);
                            return item ? item.name : 'Unknown item';
                        })
                        .join(', ');
                        
                    return interaction.reply({
                        content: `You don't have the required items for this job. Missing: ${missingItems}`,
                        ephemeral: true
                    });
                }
                
                let newJobLevel = 0;
                if (userData.Job !== "Unemployed") {
                    newJobLevel = Math.floor(userData.JobLevel / 2);
                }
                
                userData.Job = jobId;
                userData.JobLevel = newJobLevel;
                
                await userData.save();
                
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('💼 New Job')
                    .setDescription(`You are now working as a ${job.emoji} **${job.name}**!`)
                    .addFields(
                        { name: '💰 Base Pay', value: `$${job.basePay.toLocaleString()} per hour`, inline: true },
                        { name: '⭐ Job Level', value: `${newJobLevel}`, inline: true }
                    )
                    .setFooter({ text: `Use /work to earn money` })
                    .setTimestamp();
                    
                return interaction.update({ embeds: [embed], components: [] });
            }
            
        } catch (error) {
            client.logs.error("Shop interaction error:", error);
            
            return interaction.reply({
                content: "An error occurred while processing your request. Please try again later.",
                ephemeral: true
            }).catch(() => {
                return interaction.update({
                    content: "An error occurred while processing your request. Please try again later.",
                    components: []
                }).catch(() => {
                    client.logs.error("Failed to respond to interaction:", error);
                });
            });
        }
    }
};
