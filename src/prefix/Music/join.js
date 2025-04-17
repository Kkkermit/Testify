const { Constants, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'join',
  aliases: ['move'],
  usableInDms: false,
  async execute(message, client, args) {

    const embed = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | ${args[0]} **is not** a valid voice channel!`)

    const embed1 = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | You **must** be in a voice channel or enter a voice channel id!`)

    let voiceChannel = message.member.voice.channel
    if (args[0]) {
      voiceChannel = await client.channels.fetch(args[0])
      if (!Constants.VoiceBasedChannelTypes.includes(voiceChannel?.type)) {
        return message.channel.send({ embeds: [embed], flags: MessageFlags.Ephemeral })
      }
    }
    if (!voiceChannel) {
      return message.channel.send(
        { embeds: [embed1], flags: MessageFlags.Ephemeral }
      )
    }
    client.distube.voices.join(voiceChannel)
  }
}
