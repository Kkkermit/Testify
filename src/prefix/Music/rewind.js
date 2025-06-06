const { EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'rewind',
  inVoiceChannel: true,
  description: 'Rewind the current song',
  usage: 'rewind <time>',
  category: 'Music',
  usableInDms: false,
  async execute(message, client, args) {
    const queue = client.distube.getQueue(message)

    const embed = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | There is **nothing** in the queue right now!`)

    const embed1 = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | Please **provide time (in seconds)** to go rewind!`)

    const embed2 = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | Please enter a **valid** number!`)

    if (!queue) return message.channel.send({ embeds: [embed], flags: MessageFlags.Ephemeral })
    if (!args[0]) {
      return message.channel.send({ embeds: [embed1], flags: MessageFlags.Ephemeral })
    }
    const time = Number(args[0])
    if (isNaN(time)) return message.channel.send({ embeds: [embed2], flags: MessageFlags.Ephemeral })
    queue.seek((queue.currentTime - time))

    const embed3 = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setTitle(`> Music System | Rewind ${client.config.arrowEmoji}`)
      .setDescription(`${client.config.musicEmojiSuccess} | Rewinded the song for ${time}!`)
      .setTimestamp()
      .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true })})

    message.channel.send({ embeds: [embed3] })
  }
}
