const { EmbedBuilder, MessageFlags } = require('discord.js'); 

module.exports = {
  name: 'shuffle',
  inVoiceChannel: true,
  aliases: ['shuff'],
  description: 'Shuffle the current queue',
  usage: 'shuffle',
  category: 'Music',
  usableInDms: false,
  async execute(message, client, args) {
    const queue = client.distube.getQueue(message)

    const embed = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | There is **nothing** in the queue right now!`)

    if (!queue) return message.channel.send({ embeds: [embed], flags: MessageFlags.Ephemeral })
    queue.shuffle()

    const embed1 = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setTitle(`> Music System | Shuffle ${client.config.arrowEmoji}`)
      .setDescription(`${client.config.musicEmojiSuccess} | Shuffled the songs in the queue!`)
      .setTimestamp()
      .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true })})

    message.channel.send({ embeds: [embed1] })
  }
}
