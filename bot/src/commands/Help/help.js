const { SlashCommandBuilder, StringSelectMenuBuilder, ButtonStyle, ButtonBuilder, EmbedBuilder, ActionRowBuilder } = require('discord.js');
const guildSettingsSchema = require('../../schemas/prefixSystem.js');
var timeout = [];

module.exports = {
    data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Cannot find what you were wishing to? Check this out!')
    .addSubcommand(command => command.setName('server').setDescription('Join our official support server for Orbit!'))
    .addSubcommand(command => command.setName('manual').setDescription('Get some information on our bot commands and plans.')),
    async execute(interaction, client) {

        const sub = interaction.options.getSubcommand();

        switch (sub) {
            case 'server':

            const button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                .setLabel('Support Server')
                .setStyle(ButtonStyle.Link)
                .setURL("https://discord.gg/xcMVwAVjSD")
            )
        

            const embedHelpServer = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(`${client.user.username} Help Center ${client.config.arrowEmoji}`)
            .setFooter({ text: `🚑 ${client.user.username}'s support server`})
            .setTimestamp()
            .setAuthor({ name: `🚑 Help Command ${client.config.devBy}`})
            .setDescription(`> Join our official support server for ${client.user.username}! \n> Get help, report bugs, and more!`)
            .setThumbnail(client.user.avatarURL())
            .addFields({ name: `Manual link to the Discord server:`, value: `> [SERVER INVITE](https://discord.gg/xcMVwAVjSD)`})
        
            await interaction.reply({ embeds: [embedHelpServer], components: [button] })

            break;
            case 'manual':

            const helprow1 = new ActionRowBuilder()
            .addComponents(

                new StringSelectMenuBuilder()
                .setMinValues(1)
                .setMaxValues(1)
                .setCustomId('selecthelp')
                .setPlaceholder('• Select a menu')
                .addOptions(
                    {
                        label: '• Help Center',
                        description: 'Navigate to the Help Center.',
                        value: 'helpcenter',
                    },

                    {
                        label: '• How to add the bot',
                        description: `Displays how to add ${client.user.username} to your amazing server.`,
                        value: 'howtoaddbot'
                    },

                    {
                        label: '• Feedback',
                        description: `Displays how to contribute to the development of ${client.user.username} by giving feedback.`,
                        value: 'feedback'
                    },

                    {
                        label: '• Slash Commands Help',
                        description: 'Navigate to the Slash Commands help page.',
                        value: 'commands',
                    },
                    {
                        label: '• Prefix Commands Help',
                        description: 'Navigate to the Prefix Commands help page.',
                        value: 'pcommands',
                    }
                ),
            );

        const fetchGuildPrefix = await guildSettingsSchema.findOne({ Guild: interaction.guild.id });
        const guildPrefix = fetchGuildPrefix.Prefix;

        const embed = new EmbedBuilder()
        .setColor(client.config.embedColor)
        .setTitle(`${client.user.username} Help Center ${client.config.arrowEmoji}`)
        .setAuthor({ name: `🚑 Help Command ${client.config.devBy}`})
        .setFooter({ text: `🚑 ${client.user.username}'s help center`})
        .setThumbnail(client.user.avatarURL())
        .addFields({ name: `• Commands Help`, value: `> Get all **Commands** (**${client.commands.size}** slash & **${client.pcommands.size}** prefix) ${client.user.username} looks over!`})
        .addFields({ name: `• What's my prefix?`, value: `> The prefix for **${interaction.guild.name}** is \`\`${guildPrefix}\`\``})
        .addFields({ name: "• How to add Bot", value: `> Quick guide on how to add our **${client.user.username}** \n> to your server.`})
        .addFields({ name: "• Feedback", value: "> How to send us feedback and suggestions."})
        .addFields({ name: "• Exclusive Functionality", value: `> Guide on how to receive permission to \n> use exclusive functionality (${client.user.username} Beta version).`})
        .setTimestamp();

            await interaction.reply({ embeds: [embed], components: [helprow1] });
        }
    }
}