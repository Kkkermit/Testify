const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: 'resume',
  aliases: ['resume', 'unpause'],
  inVoiceChannel: true,
  async execute(message, client, args) {
    const queue = client.distube.getQueue(message)

    const embed = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | There is **nothing** in the queue right now!`)

    const embed2 = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | The queue is not paused!`)

    if (!queue) return message.channel.send({ embeds: [embed], ephemeral: true })
    if (queue.paused) {
      queue.resume()

    const embed1 = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setTitle(`> Music System | Resumed ${client.config.arrowEmoji}`)
      .setDescription(`${client.config.musicEmojiPlay} | Resumed the song for you!`)
      .setTimestamp()
      .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true })})

      message.channel.send({ embeds: [embed1] })
    } else {
      message.channel.send({ embeds: [embed2], ephemeral: true })
    }
  }
}
