const { SlashCommandBuilder, EmbedBuilder }=require('discord.js');
const filter = require('../../jsons/filter.json');

module.exports={
    data: new SlashCommandBuilder()
    .setName('master-oogway')
    .setDescription("shares part of oogways wisdom")
    .addStringOption(option => option.setName('quote').setDescription('Your choice').setRequired(true)),
    async execute(interaction, client) {

        const quote = interaction.options.getString('quote');

        if (filter.words.includes(quote)) return interaction.reply({ content: `${client.config.filterMessage}`, ephemeral: true});

        let canvas = `https://some-random-api.com/canvas/misc/oogway?quote=${encodeURIComponent(quote)}`;

        const embed = new EmbedBuilder()
        .setAuthor({ name: `Master Oogway Command ${client.config.devBy}`})
        .setTitle(`${client.user.username} Master Oogway's Wisdom ${client.config.arrowEmoji}`)
        .setImage(canvas)
        .setFooter({ text: "🐢 Master Oogway's Quotes of Wisdom"})
        .setTimestamp()
        .setColor(client.config.embedFun)
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true })});

        await interaction.reply({ embeds: [embed]});
    }
}