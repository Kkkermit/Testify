const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'volume',
  aliases: ['v', 'set', 'set-volume'],
  inVoiceChannel: true,
  async execute(message, client, args) {
    const queue = client.distube.getQueue(message)

    const embed = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | There is **nothing** in the queue right now!`)

    const embed1 = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | Please enter a **valid** number!`)

    if (!queue) return message.channel.send({ embeds: [embed], ephemeral: true })
    const volume = parseInt(args[0])
    if (isNaN(volume)) return message.channel.send({ embeds: [embed1], ephemeral: true })
    queue.setVolume(volume)

    const embed2 = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setTitle(`> Music System | Volume ${client.config.arrowEmoji}`)
      .setDescription(`${client.config.musicEmojiSuccess} | Volume set to \`${volume}\``)
      .setTimestamp()
      .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true })})

    message.channel.send({ embeds: [embed2] })
  }
}
