const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'skip',
  inVoiceChannel: true,
  async execute(message, client, args) {
    const queue = client.distube.getQueue(message)

    const embed = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | There is **nothing** in the queue right now!`)

    if (!queue) return message.channel.send({ embeds: [embed], ephemeral: true })
    try {
      const song = await queue.skip()

    const embed1 = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setTitle(`> Music System | Skip ${client.config.arrowEmoji}`)
      .setDescription(`${client.config.musicEmojiSuccess} | Skipped! Now playing:\n${song.name}`)
      .setTimestamp()
      .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true })})

      message.channel.send({ embeds: [embed1] })
    } catch (e) {

    const embed2 = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | ${e}`)

      message.channel.send({ embeds: [embed2], ephemeral: true })
    }
  }
}
