const { EmbedBuilder, MessageFlags } = require("discord.js");  

module.exports = {
  name: 'seek',
  inVoiceChannel: true,
  description: 'Seek to a specific time in the current song',
  usage: 'seek <time>',
  category: 'Music',
  usableInDms: false,
  async execute(message, client, args) {
    const queue = client.distube.getQueue(message)

    const embed = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | There is **nothing** in the queue right now!`)
    
    const embed1 = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | Please **provide position (in seconds)** to seek!`)

    const embed2 = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | Please enter a **valid** number!`)

    if (!queue) return message.channel.send({ embeds: [embed], flags: MessageFlags.Ephemeral })
    if (!args[0]) {
      return message.channel.send({ embeds: [embed1], flags: MessageFlags.Ephemeral })
    }
    const time = Number(args[0])
    if (isNaN(time)) return message.channel.send({ embeds: [embed2], flags: MessageFlags.Ephemeral })
    queue.seek(time)

    const embed3 = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setTitle(`> Music System | Seek ${client.config.arrowEmoji}`)
      .setDescription(`${client.config.musicEmojiSuccess} | Seeked to ${time}!`)
      .setTimestamp()
      .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true })})

    message.channel.send({ embeds: [embed3] })
  }
}
