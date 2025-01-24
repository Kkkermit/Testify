const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'uptime',
    aliases: ['botuptime'],
    async execute(message, client, args) {

        let totalSeconds = (client.uptime / 1000);
        let days = Math.floor(totalSeconds / 86400);
        totalSeconds %= 86400;
        let hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        let minutes = Math.floor(totalSeconds / 60);
        let seconds = Math.floor(totalSeconds % 60);

        let uptime = `**${days}**d **${hours}**h **${minutes}**m **${seconds}**s`;

        const uptimeEmbed = new EmbedBuilder()
        .setAuthor({ name: `${client.user.username} uptime ${client.config.devBy}`})
        .setColor(client.config.embedInfo)
        .setTitle('⏳ **Current uptime**')
        .addFields({ name: "Uptime", value: `> ${uptime}`})
        .setThumbnail(client.user.avatarURL())
        .setFooter({ text: `Uptime command`})
        .setTimestamp()

        message.channel.send({ embeds: [uptimeEmbed]});
    }
}