const { EmbedBuilder } = require("discord.js")

module.exports = {
  name: 'leave',
  aliases: ['l'],
  async execute(message, client, args) {
    client.distube.voices.leave(message)

    const embed = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setTitle(`> Music System | Leave ${client.config.arrowEmoji}`) 
      .setDescription(`${client.config.musicEmojiSuccess} | Left the voice channel!`)
      .setTimestamp()
      .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true })})

    message.channel.send({ embeds: [embed] })
  }
}
