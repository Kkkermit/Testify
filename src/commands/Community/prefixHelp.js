const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prefix-help')
        .setDescription('Shows the list of commands for the prefix bot.'),
        async execute(interaction, client) {

            const embed = new EmbedBuilder()
                .setAuthor({ name: `${client.user.username} ${client.config.devBy}`})
                .setTitle(`${client.user.username} **prefix** commands | **My prefix**: \`\`${client.config.prefix}\`\``)
                .setDescription(client.pcommands.map(cmd => `> ${cmd.name}`).join('\n'))
                .setColor(client.config.embedColor)
                .setFooter({ text: `Watching over ${client.pcommands.size} commands.`})
                .setTimestamp()

            await interaction.reply({ embeds: [embed] });
    }
}