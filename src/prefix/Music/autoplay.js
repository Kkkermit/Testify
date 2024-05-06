const { EmbedBuilder } = require("discord.js")

module.exports = {
  name: 'autoplay',
  inVoiceChannel: true,
  async execute (message, client) {
    const queue = client.distube.getQueue(message)

    const embed1 = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | There is **nothing** in the queue right now!`)

    if (!queue) return message.channel.send({ embeds: [embed1], ephemeral: true})
    const autoplay = queue.toggleAutoplay()

    const embed = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setTitle(`> Music System | AutoPlay ${client.config.arrowEmoji}`) 
      .setDescription(`${client.config.musicEmojiSuccess} | AutoPlay: \`${autoplay ? 'On' : 'Off'}\``)
      .setTimestamp()
      .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true })})
    
    message.channel.send({ embeds: [embed]})
  }
}
