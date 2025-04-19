const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const guildSettingsSchema = require('../../schemas/prefixSystem.js');
const { getSlashCommandsByCategory, getPrefixCommandsByCategory, getCategoryEmoji, createCommandPages } = require('../../utils/helpCommandUtils.js');

module.exports = {
    name: 'help',
    description: 'Shows the help menu',
    category: 'Info',
    usableInDms: true,
    async execute(message, client, args) {
        // Get guild prefix
        const fetchGuildPrefix = message.guild ? 
            await guildSettingsSchema.findOne({ Guild: message.guild.id }) : null;
        const guildPrefix = fetchGuildPrefix ? fetchGuildPrefix.Prefix : client.config.prefix;

        // Get command data
        const slashCommandCategories = getSlashCommandsByCategory(client);
        const prefixCommandCategories = getPrefixCommandsByCategory(client);
        
        // Generate category list with emojis
        const categoryList = Object.keys(prefixCommandCategories)
            .map(cat => `${getCategoryEmoji(cat)} **${cat}**`)
            .join(' • ');

        // Store command data for later use in interactions
        client.helpData = {
            slashCommandCategories,
            prefixCommandCategories,
            guildPrefix
        };

        // If category was specified in arguments
        if (args.length > 0) {
            const category = args[0].charAt(0).toUpperCase() + args[0].slice(1).toLowerCase();
            
            if (prefixCommandCategories[category]) {
                const commandsCategory = prefixCommandCategories[category];
                const pages = createCommandPages(commandsCategory, 6, guildPrefix);
                
                // Create the category embed for the first page
                const categoryEmbed = new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle(`${getCategoryEmoji(category)} ${category} Commands ${client.config.arrowEmoji}`)
                    .setDescription(`Here are all the ${category.toLowerCase()} prefix commands:`)
                    .setFooter({ text: `${client.user.username} Help • ${category} • Page 1/${pages.length}`, iconURL: client.user.displayAvatarURL() });

                // Add commands to the embed
                pages[0].forEach(cmd => {
                    let devStatus = cmd.underDevelopment ? '🛠️ [Under Development]' : '';
                    let aliasText = cmd.aliases && cmd.aliases.length ? `(Aliases: ${cmd.aliases.join(', ')})` : '';

                    let commandInfo = `> ${cmd.description} ${devStatus}`;

                    // Add subcommands if any
                    if (cmd.subcommands && cmd.subcommands.length > 0) {
                        commandInfo += '\n\n**Subcommands:**';
                        cmd.subcommands.forEach(sub => {
                            commandInfo += `\n> \`${guildPrefix}${cmd.name} ${sub.name}\` - ${sub.description}`;
                        });
                    }

                    categoryEmbed.addFields({
                        name: `${guildPrefix}${cmd.name} ${aliasText}`,
                        value: commandInfo
                    });
                });
                
                // Create navigation buttons for pagination
                const switchTypeButton = new ButtonBuilder()
                    .setCustomId(`help_switch_slash_${category}_0`)
                    .setLabel('Show Slash Commands')
                    .setStyle(ButtonStyle.Primary);
                    
                const navigationRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`help_back`)
                            .setLabel('Back to Help Menu')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`help_page_prev_${category}_prefix_0`)
                            .setLabel('◀')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId(`help_page_next_${category}_prefix_0`)
                            .setLabel('▶')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(pages.length <= 1)
                    );
                
                // Add type switch button if slash commands exist for this category
                if (slashCommandCategories[category]) {
                    navigationRow.addComponents(switchTypeButton);
                }

                return message.reply({ embeds: [categoryEmbed], components: [navigationRow] });
            } else {
                return message.reply(`Category \`${category}\` not found. Available categories: ${categoryList}`);
            }
        }

        // Create main help embed if no category was specified
        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(`${client.user.username} Help Center ${client.config.arrowEmoji}`)
            .setAuthor({ name: `🚑 Help Command ${client.config.devBy}` })
            .setFooter({ text: `🚑 ${client.user.username}'s help center` })
            .setThumbnail(client.user.avatarURL())
            .addFields({ name: `📊 Commands Statistics`, value: `> Get all **Commands** (**${client.commands.size}** slash & **${client.pcommands.size}** prefix) ${client.user.username} offers!` })
            .addFields({ name: `🔤 What's my prefix?`, value: `> The prefix for ${message.guild ? `**${message.guild.name}**` : 'DMs'} is \`\`${guildPrefix}\`\`` })
            .addFields({ name: `📂 Categories`, value: `> ${categoryList}` })
            .addFields({ name: "🔗 Support Server", value: `> Join our [support server](${client.config.botServerInvite}) for help` })
            .addFields({ name: "💬 Feedback", value: "> Use `/suggestion` to send feedback and suggestions" })
            .setImage('https://i.postimg.cc/8CbGp6D5/Screenshot-300.png')
            .setTimestamp();

        // Create category options for the select menu
        const categoryOptions = Object.keys(prefixCommandCategories).map(category => {
            return {
                label: `${getCategoryEmoji(category)} ${category}`,
                description: `View ${category} commands`,
                value: category,
                emoji: getCategoryEmoji(category)
            };
        });
        
        // Add help center option
        categoryOptions.unshift({
            label: '📚 Help Center',
            description: 'Navigate to the Help Center.',
            value: 'helpcenter',
            emoji: '📚'
        });
        
        // Create select menu for categories
        const categorySelectMenu = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
            .setCustomId('help_category_select_prefix')
            .setPlaceholder('📚 Select a category')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(categoryOptions)
        );
        
        // Create button to switch to slash command help
        const switchToSlashRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('switch_to_slash_help')
                .setLabel('View Slash Commands')
                .setStyle(ButtonStyle.Primary)
        );

        // Send the help message with components
        await message.reply({ embeds: [embed], components: [categorySelectMenu, switchToSlashRow] });
    },
};