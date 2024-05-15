const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('mc-skin')
    .setDescription('Get a users Minecraft skin.')
    .addStringOption(option => option.setName('username').setDescription('Minecraft username').setRequired(true)),

    async execute(interaction, client) {
    
        const username = interaction.options.getString('username');

        const embed = new EmbedBuilder()
        .setAuthor({ name: `MineCraft Skin Command ${client.config.devBy}`})
        .setTitle(`${client.user.username} Minecraft Skin Tracker ${client.config.arrowEmoji}`)
        .setDescription(`> **${username}'s** Minecraft Skin:`)
        .setImage(`https://minotar.net/body/${username}/100.png`)
        .setColor(client.config.embedCommunity)
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: `${interaction.user.avatarURL()}` })
        .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};