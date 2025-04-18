const { EmbedBuilder } = require('discord.js');
const guildSettingsSchema = require('../../schemas/prefixSystem.js');
const { getSlashCommandsByCategory, getPrefixCommandsByCategory, getCategoryEmoji } = require('../../utils/helpCommandUtils.js');

module.exports = {
    name: 'help',
    description: 'Shows the help menu',
    category: 'Info',
    usableInDms: true,
    async execute(message, client, args) {
        const fetchGuildPrefix = await guildSettingsSchema.findOne({ Guild: message.guild.id });
        const guildPrefix = fetchGuildPrefix ? fetchGuildPrefix.Prefix : client.config.prefix;

        const slashCommandCategories = getSlashCommandsByCategory(client);
        const prefixCommandCategories = getPrefixCommandsByCategory(client);

        const categoryList = Object.keys(prefixCommandCategories)
            .map(cat => `${getCategoryEmoji(cat)} **${cat}**`)
            .join(' • ');

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(`${client.user.username} Help Center ${client.config.arrowEmoji}`)
            .setAuthor({ name: `🚑 Help Command ${client.config.devBy}` })
            .setFooter({ text: `🚑 ${client.user.username}'s help center` })
            .setThumbnail(client.user.avatarURL())
            .addFields({ name: `📊 Commands Statistics`, value: `> Get all **Commands** (**${client.commands.size}** slash & **${client.pcommands.size}** prefix) ${client.user.username} offers!` })
            .addFields({ name: `🔤 What's my prefix?`, value: `> The prefix for **${message.guild.name}** is \`\`${guildPrefix}\`\`` })
            .addFields({ name: `📂 Categories`, value: `> ${categoryList}` })
            .addFields({ name: "🔗 Support Server", value: `> Join our [support server](${client.config.botServerInvite}) for help` })
            .addFields({ name: "💬 Feedback", value: "> Use `/suggestion` to send feedback and suggestions" })
            .setImage('https://i.postimg.cc/8CbGp6D5/Screenshot-300.png')
            .setTimestamp();

        if (args.length > 0) {
            const category = args[0].charAt(0).toUpperCase() + args[0].slice(1).toLowerCase();

            if (prefixCommandCategories[category]) {
                const categoryCommands = prefixCommandCategories[category];

                const categoryEmbed = new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle(`${getCategoryEmoji(category)} ${category} Commands ${client.config.arrowEmoji}`)
                    .setDescription(`Here are all the ${category.toLowerCase()} prefix commands:`)
                    .setFooter({ text: `${client.user.username} Help • ${category} • Page 1/${Math.ceil(categoryCommands.length / 6)}`, iconURL: client.user.displayAvatarURL() });

                categoryCommands.slice(0, 6).forEach(cmd => {
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

                return message.reply({ embeds: [categoryEmbed] });
            } else {
                return message.reply(`Category \`${category}\` not found. Available categories: ${categoryList}`);
            }
        }

        await message.reply({ embeds: [embed] });
    },
};