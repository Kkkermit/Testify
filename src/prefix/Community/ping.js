const { EmbedBuilder } = require('discord.js'); 

module.exports = {
    name: 'ping',
    async execute(message, client) {

        const embed = new EmbedBuilder()
        .setAuthor({ name: `${client.user.username} ${client.config.devBy}`})
        .setTitle(`${client.user.username} **ping** command ${client.config.devBy}`)
        .setDescription(`> Pong! ${client.ws.ping}ms`)
        .setColor(client.config.embedCommunity)
        .setFooter({ text: `Requested by ${message.author.username}`, iconURL: message.author.avatarURL() })
        .setTimestamp()

        message.channel.send({ embeds: [embed] });
    }
}