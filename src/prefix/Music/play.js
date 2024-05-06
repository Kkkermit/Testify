const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'play',
  aliases: ['p'],
  inVoiceChannel: true,
  async execute(message, client, args) {
    const string = args.join(' ')

    const embed = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | Please **enter a song url** or query to search.`)

    if (!string) return message.channel.send({ embeds: [embed], ephemeral: true })
    client.distube.play(message.member.voice.channel, string, {
      member: message.member,
      textChannel: message.channel,
      message
    })
  }
}
