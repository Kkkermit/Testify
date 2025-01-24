const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: 'playtop',
  aliases: ['pt'],
  inVoiceChannel: true,
  async execute(message, client, args) {
    const string = args.join(' ')

    const embed = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | There is **nothing** in the queue right now!`)

    if (!string) return message.channel.send({ embeds: [embed], ephemeral: true })
    client.distube.play(message.member.voice.channel, string, {
      member: message.member,
      textChannel: message.channel,
      message,
      position: 1
    })
  }
}
