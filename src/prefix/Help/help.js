const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const guildSettingsSchema = require('../../schemas/prefixSystem.js');
const { getSlashCommandsByCategory, getPrefixCommandsByCategory, getCategoryEmoji, createCommandPages } = require('../../utils/helpCommandUtils.js');

module.exports = {
    name: 'help',
    description: 'Shows the help menu',
    category: 'Info',
    usableInDms: true,
    async execute(message, client, args) {
        const fetchGuildPrefix = message.guild ? 
            await guildSettingsSchema.findOne({ Guild: message.guild.id }) : null;
        const guildPrefix = fetchGuildPrefix ? fetchGuildPrefix.Prefix : client.config.prefix;

        const slashCommandCategories = getSlashCommandsByCategory(client);
        const prefixCommandCategories = getPrefixCommandsByCategory(client);
        
        const categoryList = Object.keys(prefixCommandCategories)
            .map(cat => `${getCategoryEmoji(cat)} **${cat}**`)
            .join(' • ');

        client.helpData = {
            slashCommandCategories,
            prefixCommandCategories,
            guildPrefix
        };

        if (args.length > 0) {
            const category = args[0].charAt(0).toUpperCase() + args[0].slice(1).toLowerCase();
            
            if (prefixCommandCategories[category]) {
                const commandsCategory = prefixCommandCategories[category];
                const pages = createCommandPages(commandsCategory, 6, guildPrefix);
                
                const categoryEmbed = new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle(`${getCategoryEmoji(category)} ${category} Commands ${client.config.arrowEmoji}`)
                    .setDescription(`Here are all the ${category.toLowerCase()} prefix commands:`)
                    .setFooter({ text: `${client.user.username} Help • ${category} • Page 1/${pages.length}`, iconURL: client.user.displayAvatarURL() });

                pages[0].forEach(cmd => {
                    let devStatus = cmd.underDevelopment ? '🛠️ [Under Development]' : '';
                    let aliasText = cmd.aliases && cmd.aliases.length ? `(Aliases: ${cmd.aliases.join(', ')})` : '';

                    let commandInfo = `> ${cmd.description} ${devStatus}`;

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
                
                if (slashCommandCategories[category]) {
                    navigationRow.addComponents(switchTypeButton);
                }

                return message.reply({ embeds: [categoryEmbed], components: [navigationRow] });
            } else {
                return message.reply(`Category \`${category}\` not found. Available categories: ${categoryList}`);
            }
        }

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

        const categoryOptions = Object.keys(prefixCommandCategories).map(category => {
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

        await message.reply({ embeds: [embed], components: [categorySelectMenu, switchToSlashRow] });
    },
};