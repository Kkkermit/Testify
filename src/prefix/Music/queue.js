const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
  name: 'queue',
  aliases: ['q'],
  description: 'Display the current queue',
  usage: 'queue',
  category: 'Music',
  usableInDms: false,
  async execute(message, client, args){
    const queue = client.distube.getQueue(message)

    const embed = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | There is **nothing** playing!`)

    if (!queue) return message.channel.send({ embeds: [embed], flags: MessageFlags.Ephemeral })
    const q = queue.songs
      .map((song, i) => `${i === 0 ? 'Playing:' : `${i}.`} ${song.name} - \`${song.formattedDuration}\``)
      .join('\n')

    const embed1 = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setTitle(`> Music System | Queue ${client.config.arrowEmoji}`)
      .setDescription(`${client.config.musicEmojiQueue} | **Server Queue**\n${q}`)
      .setTimestamp()
      .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true })})

    message.channel.send({ embeds: [embed1] })
  }
}
