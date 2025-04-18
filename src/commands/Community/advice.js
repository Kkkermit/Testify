const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    usableInDms: true,
    category: "Community",
    data: new SlashCommandBuilder()
    .setName(`advice`)
    .setDescription(`Get a random piece of advice.`),
    async execute(interaction, client) {

        const data = await fetch("https://api.adviceslip.com/advice").then((res) =>
            res.json()
        );

        const embed = new EmbedBuilder()
        .setTimestamp()
        .setThumbnail(client.user.avatarURL())
        .setAuthor({ name: `Community System ${client.config.devBy}`})
        .setTitle(`${client.user.username} Advice Randomizer ${client.config.arrowEmoji}`)
        .setDescription(`> Here is your random advice:`)
        .addFields({ name: `Advice`, value: `> ${data.slip.advice}`})
        .setColor(client.config.embedCommunity)
        .setFooter({ text: `Advice given`})

        await interaction.reply({ embeds: [embed] });
    }
}