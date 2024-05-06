const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: 'filter',
  aliases: ['filters'],
  inVoiceChannel: true,
  async execute(message, client, args) {
    const queue = client.distube.getQueue(message)

    const embed = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | There is **nothing** in the queue right now!`)
    
    const embed1 = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | Please enter a **valid** filter to apply to the music!`)

    if (!queue) return message.channel.send({ embeds: [embed], ephemeral: true })
    const filter = args[0]
    if (filter === 'off' && queue.filters.size) queue.filters.clear()
    else if (Object.keys(client.distube.filters).includes(filter)) {
      if (queue.filters.has(filter)) queue.filters.remove(filter)
      else queue.filters.add(filter)
    } else if (args[0]) return message.channel.send({ embeds: [embed1], ephemeral: true })

      const embed2 = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setTitle(`> Music System | Filters ${client.config.arrowEmoji}`) 
      .setDescription(`${client.config.musicEmojiSuccess} | Current Queue Filters: \`${queue.filters.join(', ') || 'Off'}\``)
      .setTimestamp()
      .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true })})
    
    message.channel.send({ embeds: [embed2]})
  }
}
