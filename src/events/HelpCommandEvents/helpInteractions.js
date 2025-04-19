const { Events, EmbedBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { createCommandPages, getCategoryEmoji } = require('../../utils/helpCommandUtils.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;
        
        // Handle category selection for slash commands
        if (interaction.customId === 'help_category_select') {
            const selectedCategory = interaction.values[0];
            const helpData = client.helpData;
            
            if (!helpData) return;
            
            if (selectedCategory === 'helpcenter') {
                const categoryList = Object.keys(helpData.slashCommandCategories)
                    .map(cat => `${getCategoryEmoji(cat)} **${cat}**`)
                    .join(' • ');
                
                const embed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setTitle(`${client.user.username} Help Center ${client.config.arrowEmoji}`)
                .setAuthor({ name: `🚑 Help Command ${client.config.devBy}`})
                .setFooter({ text: `🚑 ${client.user.username}'s help center`})
                .setThumbnail(client.user.avatarURL())
                .addFields({ name: `📊 Commands Statistics`, value: `> Get all **Commands** (**${client.commands.size}** slash & **${client.pcommands.size}** prefix) ${client.user.username} offers!`})
                .addFields({ name: `🔤 What's my prefix?`, value: `> The prefix for this server is \`${helpData.guildPrefix}\``})
                .addFields({ name: `📂 Categories`, value: `> ${categoryList}`})
                .addFields({ name: "🔗 Support Server", value: `> Join our [support server](${client.config.botServerInvite}) for help`})
                .addFields({ name: "💬 Feedback", value: "> Use `/suggestion` to send feedback and suggestions"})
                .setImage('https://i.postimg.cc/8CbGp6D5/Screenshot-300.png')
                .setTimestamp();
                
                const categoryOptions = Object.keys(helpData.slashCommandCategories).map(category => {
                    return {
                        label: `${getCategoryEmoji(category)} ${category}`,
                        description: `View ${category} commands`,
                        value: category,
                        emoji: getCategoryEmoji(category)
                    };
                });
                
                categoryOptions.unshift({
                    label: '📚 Help Center',
                    description: 'Navigate to the Help Center.',
                    value: 'helpcenter',
                    emoji: '📚'
                });
                
                const categorySelectMenu = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                    .setCustomId('help_category_select')
                    .setPlaceholder('📚 Select a category')
                    .setMinValues(1)
                    .setMaxValues(1)
                    .addOptions(categoryOptions)
                );
                
                const switchToPrefixRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('switch_to_prefix_help')
                        .setLabel('View Prefix Commands')
                        .setStyle(ButtonStyle.Primary)
                );
                
                return interaction.update({ embeds: [embed], components: [categorySelectMenu, switchToPrefixRow] });
            }
            
            const isSlash = interaction.message.components[0]?.components[0]?.customId === 'help_category_select' || !interaction.message.components[1];
            const commandsInCategory = isSlash ? 
                helpData.slashCommandCategories[selectedCategory] :
                helpData.prefixCommandCategories[selectedCategory];
            
            if (!commandsInCategory) {
                return interaction.reply({ content: 'Category not found', flags: MessageFlags.Ephemeral });
            }
            
            const pages = createCommandPages(commandsInCategory, 8, isSlash ? '/' : helpData.guildPrefix);
            
            const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(`${getCategoryEmoji(selectedCategory)} ${selectedCategory} Commands ${client.config.arrowEmoji}`)
            .setDescription(`Here are all the ${selectedCategory.toLowerCase()} ${isSlash ? 'slash' : 'prefix'} commands:`)
            .setFooter({ text: `${client.user.username} Help • ${selectedCategory} • Page 1/${pages.length}`, iconURL: client.user.displayAvatarURL() });
            
            pages[0].forEach(cmd => {
                let devStatus = cmd.underDevelopment ? '🛠️ [Under Development]' : '';
                
                let commandInfo = `> ${cmd.description} ${devStatus}`;
                
                if (cmd.subcommands && cmd.subcommands.length > 0) {
                    commandInfo += '\n\n**Subcommands:**';
                    cmd.subcommands.forEach(sub => {
                        commandInfo += `\n> \`${isSlash ? `/${cmd.name} ${sub.name}` : `${helpData.guildPrefix}${cmd.name} ${sub.name}`}\` - ${sub.description}`;
                    });
                }
                
                embed.addFields({
                    name: `${isSlash ? '/' : helpData.guildPrefix}${cmd.name}`,
                    value: commandInfo
                });
            });
            
            const switchTypeButton = new ButtonBuilder()
                .setCustomId(`help_switch_${isSlash ? 'prefix' : 'slash'}_${selectedCategory}_0`)
                .setLabel(`Show ${isSlash ? 'Prefix' : 'Slash'} Commands`)
                .setStyle(ButtonStyle.Primary);
                
            const navigationRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`help_back`)
                        .setLabel('Back to Help Menu')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`help_page_prev_${selectedCategory}_${isSlash ? 'slash' : 'prefix'}_0`)
                        .setLabel('◀')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId(`help_page_next_${selectedCategory}_${isSlash ? 'slash' : 'prefix'}_0`)
                        .setLabel('▶')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(pages.length <= 1)
                );
            
            if (helpData.slashCommandCategories[selectedCategory] && helpData.prefixCommandCategories[selectedCategory]) {
                navigationRow.addComponents(switchTypeButton);
            }
            
            interaction.message._pageData = {
                category: selectedCategory,
                currentPage: 0,
                totalPages: pages.length,
                commandType: isSlash ? 'slash' : 'prefix'
            };
            
            await interaction.update({ embeds: [embed], components: [navigationRow] });
        }
        
        // Handle category selection for prefix commands
        if (interaction.customId === 'help_category_select_prefix') {
            const selectedCategory = interaction.values[0];
            const helpData = client.helpData;
            
            if (!helpData) return;
            
            if (selectedCategory === 'helpcenter') {
                const categoryList = Object.keys(helpData.prefixCommandCategories)
                    .map(cat => `${getCategoryEmoji(cat)} **${cat}**`)
                    .join(' • ');
                
                const embed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setTitle(`${client.user.username} Help Center ${client.config.arrowEmoji}`)
                .setAuthor({ name: `🚑 Help Command ${client.config.devBy}`})
                .setFooter({ text: `🚑 ${client.user.username}'s help center`})
                .setThumbnail(client.user.avatarURL())
                .addFields({ name: `📊 Commands Statistics`, value: `> Get all **Commands** (**${client.commands.size}** slash & **${client.pcommands.size}** prefix) ${client.user.username} offers!`})
                .addFields({ name: `🔤 What's my prefix?`, value: `> The prefix for this server is \`${helpData.guildPrefix}\``})
                .addFields({ name: `📂 Categories`, value: `> ${categoryList}`})
                .addFields({ name: "🔗 Support Server", value: `> Join our [support server](${client.config.botServerInvite}) for help`})
                .addFields({ name: "💬 Feedback", value: "> Use `/suggestion` to send feedback and suggestions"})
                .setImage('https://i.postimg.cc/8CbGp6D5/Screenshot-300.png')
                .setTimestamp();
                
                const categoryOptions = Object.keys(helpData.prefixCommandCategories).map(category => {
                    return {
                        label: `${getCategoryEmoji(category)} ${category}`,
                        description: `View ${category} commands`,
                        value: category,
                        emoji: getCategoryEmoji(category)
                    };
                });
                
                categoryOptions.unshift({
                    label: '📚 Help Center',
                    description: 'Navigate to the Help Center.',
                    value: 'helpcenter',
                    emoji: '📚'
                });
                
                const categorySelectMenu = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                    .setCustomId('help_category_select_prefix')
                    .setPlaceholder('📚 Select a category')
                    .setMinValues(1)
                    .setMaxValues(1)
                    .addOptions(categoryOptions)
                );
                
                const switchToSlashRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('switch_to_slash_help')
                        .setLabel('View Slash Commands')
                        .setStyle(ButtonStyle.Primary)
                );
                
                return interaction.update({ embeds: [embed], components: [categorySelectMenu, switchToSlashRow] });
            }
            
            const commandsInCategory = helpData.prefixCommandCategories[selectedCategory];
            
            if (!commandsInCategory) {
                return interaction.reply({ content: 'Category not found', flags: MessageFlags.Ephemeral });
            }
            
            const pages = createCommandPages(commandsInCategory, 6, helpData.guildPrefix);
            
            const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(`${getCategoryEmoji(selectedCategory)} ${selectedCategory} Commands ${client.config.arrowEmoji}`)
            .setDescription(`Here are all the ${selectedCategory.toLowerCase()} prefix commands:`)
            .setFooter({ text: `${client.user.username} Help • ${selectedCategory} • Page 1/${pages.length}`, iconURL: client.user.displayAvatarURL() });
            
            pages[0].forEach(cmd => {
                let devStatus = cmd.underDevelopment ? '🛠️ [Under Development]' : '';
                let aliasText = cmd.aliases && cmd.aliases.length ? `(Aliases: ${cmd.aliases.join(', ')})` : '';
                
                let commandInfo = `> ${cmd.description} ${devStatus}`;
                
                if (cmd.subcommands && cmd.subcommands.length > 0) {
                    commandInfo += '\n\n**Subcommands:**';
                    cmd.subcommands.forEach(sub => {
                        commandInfo += `\n> \`${helpData.guildPrefix}${cmd.name} ${sub.name}\` - ${sub.description}`;
                    });
                }
                
                embed.addFields({
                    name: `${helpData.guildPrefix}${cmd.name} ${aliasText}`,
                    value: commandInfo
                });
            });
            
            const switchTypeButton = new ButtonBuilder()
                .setCustomId(`help_switch_slash_${selectedCategory}_0`)
                .setLabel(`Show Slash Commands`)
                .setStyle(ButtonStyle.Primary);
                
            const navigationRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`help_back_prefix`)
                        .setLabel('Back to Help Menu')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`help_page_prev_${selectedCategory}_prefix_0`)
                        .setLabel('◀')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId(`help_page_next_${selectedCategory}_prefix_0`)
                        .setLabel('▶')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(pages.length <= 1)
                );
            
            if (helpData.slashCommandCategories[selectedCategory]) {
                navigationRow.addComponents(switchTypeButton);
            }
            
            await interaction.update({ embeds: [embed], components: [navigationRow] });
        }
        
        // Handle page navigation
        if (interaction.customId.startsWith('help_page_')) {
            const parts = interaction.customId.split('_');
            const direction = parts[2];
            const category = parts[3];
            const commandType = parts[4];
            let page = parseInt(parts[5]);
            
            const helpData = client.helpData;
            if (!helpData) return;
            
            const commandsInCategory = commandType === 'slash' ? 
                helpData.slashCommandCategories[category] : 
                helpData.prefixCommandCategories[category];
            
            const pages = createCommandPages(commandsInCategory, 6, commandType === 'slash' ? '/' : helpData.guildPrefix);
            
            if (direction === 'next') page++;
            else if (direction === 'prev') page--;
            
            if (page < 0) page = 0;
            if (page >= pages.length) page = pages.length - 1;
            
            const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(`${getCategoryEmoji(category)} ${category} Commands ${client.config.arrowEmoji}`)
            .setDescription(`Here are all the ${category.toLowerCase()} ${commandType} commands:`)
            .setFooter({ text: `${client.user.username} Help • ${category} • Page ${page + 1}/${pages.length}`, iconURL: client.user.displayAvatarURL() });
            
            pages[page].forEach(cmd => {
                let devStatus = cmd.underDevelopment ? '🛠️ [Under Development]' : '';
                
                let commandInfo = `> ${cmd.description} ${devStatus}`;
                
                if (cmd.subcommands && cmd.subcommands.length > 0) {
                    commandInfo += '\n\n**Subcommands:**';
                    cmd.subcommands.forEach(sub => {
                        commandInfo += `\n> \`${commandType === 'slash' ? `/${cmd.name} ${sub.name}` : `${helpData.guildPrefix}${cmd.name} ${sub.name}`}\` - ${sub.description}`;
                    });
                }
                
                embed.addFields({
                    name: `${commandType === 'slash' ? '/' : helpData.guildPrefix}${cmd.name}`,
                    value: commandInfo
                });
            });
            
            const switchTypeButton = new ButtonBuilder()
                .setCustomId(`help_switch_${commandType === 'slash' ? 'prefix' : 'slash'}_${category}_${page}`)
                .setLabel(`Show ${commandType === 'slash' ? 'Prefix' : 'Slash'} Commands`)
                .setStyle(ButtonStyle.Primary);
                
            const navigationRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`help_back_${commandType}`)
                        .setLabel('Back to Help Menu')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`help_page_prev_${category}_${commandType}_${page}`)
                        .setLabel('◀')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page <= 0),
                    new ButtonBuilder()
                        .setCustomId(`help_page_next_${category}_${commandType}_${page}`)
                        .setLabel('▶')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page >= pages.length - 1)
                );
                
            if (helpData.slashCommandCategories[category] && helpData.prefixCommandCategories[category]) {
                navigationRow.addComponents(switchTypeButton);
            }
            
            await interaction.update({ embeds: [embed], components: [navigationRow] });
        }
        
        // Handle command type switch
        if (interaction.customId.startsWith('help_switch_')) {
            const parts = interaction.customId.split('_');
            const newType = parts[2];
            const category = parts[3];
            const currentPage = parseInt(parts[4]);
            
            const helpData = client.helpData;
            if (!helpData) return;
            
            const commandsInCategory = newType === 'slash' ? 
                helpData.slashCommandCategories[category] : 
                helpData.prefixCommandCategories[category];
            
            if (!commandsInCategory || commandsInCategory.length === 0) {
                return interaction.reply({ content: `No ${newType} commands found in the ${category} category`, flags: MessageFlags.Ephemeral });
            }
            
            const pages = createCommandPages(commandsInCategory, 8, newType === 'slash' ? '/' : helpData.guildPrefix);
            
            const page = 0;
            
            const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(`${getCategoryEmoji(category)} ${category} Commands ${client.config.arrowEmoji}`)
            .setDescription(`Here are all the ${category.toLowerCase()} ${newType} commands:`)
            .setFooter({ text: `${client.user.username} Help • ${category} • Page ${page + 1}/${pages.length}`, iconURL: client.user.displayAvatarURL() });
            
            pages[page].forEach(cmd => {
                let devStatus = cmd.underDevelopment ? '🛠️ [Under Development]' : '';
                
                let commandInfo = `> ${cmd.description} ${devStatus}`;
                
                if (cmd.subcommands && cmd.subcommands.length > 0) {
                    commandInfo += '\n\n**Subcommands:**';
                    cmd.subcommands.forEach(sub => {
                        commandInfo += `\n> \`${newType === 'slash' ? `/${cmd.name} ${sub.name}` : `${helpData.guildPrefix}${cmd.name} ${sub.name}`}\` - ${sub.description}`;
                    });
                }
                
                embed.addFields({
                    name: `${newType === 'slash' ? '/' : helpData.guildPrefix}${cmd.name}`,
                    value: commandInfo
                });
            });
            
            const switchTypeButton = new ButtonBuilder()
                .setCustomId(`help_switch_${newType === 'slash' ? 'prefix' : 'slash'}_${category}_${page}`)
                .setLabel(`Show ${newType === 'slash' ? 'Prefix' : 'Slash'} Commands`)
                .setStyle(ButtonStyle.Primary);
                
            const navigationRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`help_back_${newType}`)
                        .setLabel('Back to Help Menu')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`help_page_prev_${category}_${newType}_${page}`)
                        .setLabel('◀')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page <= 0),
                    new ButtonBuilder()
                        .setCustomId(`help_page_next_${category}_${newType}_${page}`)
                        .setLabel('▶')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page >= pages.length - 1)
                );
                
            navigationRow.addComponents(switchTypeButton);
            
            await interaction.update({ embeds: [embed], components: [navigationRow] });
        }
        
        // Handle back to help menu button for slash commands
        if (interaction.customId === 'help_back') {
            const helpData = client.helpData;
            if (!helpData) return;
            
            const categoryList = Object.keys(helpData.slashCommandCategories)
                .map(cat => `${getCategoryEmoji(cat)} **${cat}**`)
                .join(' • ');
            
            const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(`${client.user.username} Help Center ${client.config.arrowEmoji}`)
            .setAuthor({ name: `🚑 Help Command ${client.config.devBy}`})
            .setFooter({ text: `🚑 ${client.user.username}'s help center`})
            .setThumbnail(client.user.avatarURL())
            .addFields({ name: `📊 Commands Statistics`, value: `> Get all **Commands** (**${client.commands.size}** slash & **${client.pcommands.size}** prefix) ${client.user.username} offers!`})
            .addFields({ name: `🔤 What's my prefix?`, value: `> The prefix for this server is \`${helpData.guildPrefix}\``})
            .addFields({ name: `📂 Categories`, value: `> ${categoryList}`})
            .addFields({ name: "🔗 Support Server", value: `> Join our [support server](${client.config.botServerInvite}) for help`})
            .addFields({ name: "💬 Feedback", value: "> Use `/suggestion` to send feedback and suggestions"})
            .setImage('https://i.postimg.cc/8CbGp6D5/Screenshot-300.png')
            .setTimestamp();
            
            const categoryOptions = Object.keys(helpData.slashCommandCategories).map(category => {
                return {
                    label: `${getCategoryEmoji(category)} ${category}`,
                    description: `View ${category} commands`,
                    value: category,
                    emoji: getCategoryEmoji(category)
                };
            });
            
            categoryOptions.unshift({
                label: '📚 Help Center',
                description: 'Navigate to the Help Center.',
                value: 'helpcenter',
                emoji: '📚'
            });
            
            const categorySelectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                .setCustomId('help_category_select')
                .setPlaceholder('📚 Select a category')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(categoryOptions)
            );
            
            const switchToPrefixRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('switch_to_prefix_help')
                    .setLabel('View Prefix Commands')
                    .setStyle(ButtonStyle.Primary)
            );
            
            await interaction.update({ embeds: [embed], components: [categorySelectMenu, switchToPrefixRow] });
        }
        
        // Handle back to help menu button for prefix commands
        if (interaction.customId === 'help_back_prefix') {
            const helpData = client.helpData;
            if (!helpData) return;
            
            const categoryList = Object.keys(helpData.prefixCommandCategories)
                .map(cat => `${getCategoryEmoji(cat)} **${cat}**`)
                .join(' • ');
            
            const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(`${client.user.username} Help Center ${client.config.arrowEmoji}`)
            .setAuthor({ name: `🚑 Help Command ${client.config.devBy}`})
            .setFooter({ text: `🚑 ${client.user.username}'s help center`})
            .setThumbnail(client.user.avatarURL())
            .addFields({ name: `📊 Commands Statistics`, value: `> Get all **Commands** (**${client.commands.size}** slash & **${client.pcommands.size}** prefix) ${client.user.username} offers!`})
            .addFields({ name: `🔤 What's my prefix?`, value: `> The prefix for this server is \`${helpData.guildPrefix}\``})
            .addFields({ name: `📂 Categories`, value: `> ${categoryList}`})
            .addFields({ name: "🔗 Support Server", value: `> Join our [support server](${client.config.botServerInvite}) for help`})
            .addFields({ name: "💬 Feedback", value: "> Use `/suggestion` to send feedback and suggestions"})
            .setImage('https://i.postimg.cc/8CbGp6D5/Screenshot-300.png')
            .setTimestamp();
            
            const categoryOptions = Object.keys(helpData.prefixCommandCategories).map(category => {
                return {
                    label: `${getCategoryEmoji(category)} ${category}`,
                    description: `View ${category} commands`,
                    value: category,
                    emoji: getCategoryEmoji(category)
                };
            });
            
            categoryOptions.unshift({
                label: '📚 Help Center',
                description: 'Navigate to the Help Center.',
                value: 'helpcenter',
                emoji: '📚'
            });
            
            const categorySelectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                .setCustomId('help_category_select_prefix')
                .setPlaceholder('📚 Select a category')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(categoryOptions)
            );
            
            const switchToSlashRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('switch_to_slash_help')
                    .setLabel('View Slash Commands')
                    .setStyle(ButtonStyle.Primary)
            );
            
            await interaction.update({ embeds: [embed], components: [categorySelectMenu, switchToSlashRow] });
        }
        
        // Handle switch to slash commands button
        if (interaction.customId === 'switch_to_slash_help') {
            const helpData = client.helpData;
            if (!helpData) return;
            
            const categoryList = Object.keys(helpData.slashCommandCategories)
                .map(cat => `${getCategoryEmoji(cat)} **${cat}**`)
                .join(' • ');
            
            const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(`${client.user.username} Help Center ${client.config.arrowEmoji}`)
            .setAuthor({ name: `🚑 Help Command ${client.config.devBy}`})
            .setFooter({ text: `🚑 ${client.user.username}'s help center`})
            .setThumbnail(client.user.avatarURL())
            .addFields({ name: `📊 Commands Statistics`, value: `> Get all **Commands** (**${client.commands.size}** slash & **${client.pcommands.size}** prefix) ${client.user.username} offers!`})
            .addFields({ name: `🔤 What's my prefix?`, value: `> The prefix for this server is \`${helpData.guildPrefix}\``})
            .addFields({ name: `📂 Categories`, value: `> ${categoryList}`})
            .addFields({ name: "🔗 Support Server", value: `> Join our [support server](${client.config.botServerInvite}) for help`})
            .addFields({ name: "💬 Feedback", value: "> Use `/suggestion` to send feedback and suggestions"})
            .setImage('https://i.postimg.cc/8CbGp6D5/Screenshot-300.png')
            .setTimestamp();
            
            const categoryOptions = Object.keys(helpData.slashCommandCategories).map(category => {
                return {
                    label: `${getCategoryEmoji(category)} ${category}`,
                    description: `View ${category} commands`,
                    value: category,
                    emoji: getCategoryEmoji(category)
                };
            });
            
            categoryOptions.unshift({
                label: '📚 Help Center',
                description: 'Navigate to the Help Center.',
                value: 'helpcenter',
                emoji: '📚'
            });
            
            const categorySelectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                .setCustomId('help_category_select')
                .setPlaceholder('📚 Select a category')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(categoryOptions)
            );
            
            const switchToPrefixRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('switch_to_prefix_help')
                    .setLabel('View Prefix Commands')
                    .setStyle(ButtonStyle.Primary)
            );
            
            await interaction.update({ embeds: [embed], components: [categorySelectMenu, switchToPrefixRow] });
        }
        
        // Handle switch to prefix commands button
        if (interaction.customId === 'switch_to_prefix_help') {
            const helpData = client.helpData;
            if (!helpData) return;
            
            const categoryList = Object.keys(helpData.prefixCommandCategories)
                .map(cat => `${getCategoryEmoji(cat)} **${cat}**`)
                .join(' • ');
            
            const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(`${client.user.username} Help Center ${client.config.arrowEmoji}`)
            .setAuthor({ name: `🚑 Help Command ${client.config.devBy}`})
            .setFooter({ text: `🚑 ${client.user.username}'s help center`})
            .setThumbnail(client.user.avatarURL())
            .addFields({ name: `📊 Commands Statistics`, value: `> Get all **Commands** (**${client.commands.size}** slash & **${client.pcommands.size}** prefix) ${client.user.username} offers!`})
            .addFields({ name: `🔤 What's my prefix?`, value: `> The prefix for this server is \`${helpData.guildPrefix}\``})
            .addFields({ name: `📂 Categories`, value: `> ${categoryList}`})
            .addFields({ name: "🔗 Support Server", value: `> Join our [support server](${client.config.botServerInvite}) for help`})
            .addFields({ name: "💬 Feedback", value: "> Use `/suggestion` to send feedback and suggestions"})
            .setImage('https://i.postimg.cc/8CbGp6D5/Screenshot-300.png')
            .setTimestamp();
            
            const categoryOptions = Object.keys(helpData.prefixCommandCategories).map(category => {
                return {
                    label: `${getCategoryEmoji(category)} ${category}`,
                    description: `View ${category} commands`,
                    value: category,
                    emoji: getCategoryEmoji(category)
                };
            });
            
            categoryOptions.unshift({
                label: '📚 Help Center',
                description: 'Navigate to the Help Center.',
                value: 'helpcenter',
                emoji: '📚'
            });
            
            const categorySelectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                .setCustomId('help_category_select_prefix')
                .setPlaceholder('📚 Select a category')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(categoryOptions)
            );
            
            const switchToSlashRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('switch_to_slash_help')
                    .setLabel('View Slash Commands')
                    .setStyle(ButtonStyle.Primary)
            );
            
            await interaction.update({ embeds: [embed], components: [categorySelectMenu, switchToSlashRow] });
        }
    }
};
