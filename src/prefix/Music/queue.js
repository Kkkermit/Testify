const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: 'queue',
  aliases: ['q'],
  async execute(message, client, args){
    const queue = client.distube.getQueue(message)

    const embed = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | There is **nothing** playing!`)

    if (!queue) return message.channel.send({ embeds: [embed], ephemeral: true })
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
