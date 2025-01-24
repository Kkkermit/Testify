const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('Test command'),
    async execute(interaction, client) {

        const embed = new EmbedBuilder()
        .setColor(client.config.embedCommunity)
        .setDescription(`Test command successful | ${client.user.username} is online!`)

        await interaction.reply({ content: `<@${interaction.user.id}>` , embeds: [embed]})
    }
}