const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
  name: 'previous',
  inVoiceChannel: true,
  usableInDms: false,
  aliases: ['prev'],
  description: 'Play the previous song',
  usage: 'previous',
  category: 'Music',
  async execute(message, client, args) {
    const queue = client.distube.getQueue(message)

    const embed = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | There is **nothing** in the queue right now!`)

    if (!queue) return message.channel.send({ embeds: [embed], flags: MessageFlags.Ephemeral })
    const song = queue.previous()

    const embed1 = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setTitle(`> Music System | Previous ${client.config.arrowEmoji}`)
      .setDescription(`${client.config.musicEmojiSuccess} | Now playing:\n${song.name}`)
      .setTimestamp()
      .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true })})

    message.channel.send({ embeds: [embed1] })
  }
}
