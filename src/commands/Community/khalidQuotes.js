const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const khaledQuotes = require('../../jsons/khalidQuotes.json');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('khaled-quotes')
    .setDescription('Gives you a random quote from DJ Khaled.'),
    async execute(interaction) {

        const randomize = Math.floor(Math.random() * khaledQuotes.length);

        const embed = new EmbedBuilder()
        .setAuthor({ name: `🗣️ • Khaled Quotes`})
        .setFooter({ text: `🗣️ • God did`})
        .setTitle('Right From DJ Khaled himself!')
        .setThumbnail('https://media.tenor.com/6Exkhhjc4HgAAAAd/dj-khaled.gif')
        .setTimestamp()
        .setDescription(`> ${khaledQuotes[randomize]}`)

        await interaction.reply({ embeds: [embed] });
    }
}