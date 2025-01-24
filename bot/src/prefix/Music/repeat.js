const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'repeat',
  aliases: ['loop', 'rp'],
  inVoiceChannel: true,
  async execute(message, client, args) {
    const queue = client.distube.getQueue(message)

    const embed = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | There is **nothing** in the playing!`)

      if (!queue) return message.channel.send({ embeds: [embed], ephemeral: true })

        let mode = null
        const validModes = ['off', 'song', 'queue'];
        
        if (!args[0] || !validModes.includes(args[0])) {
            const embed2 = new EmbedBuilder()
                .setColor(client.config.embedMusic)
                .setDescription(`${client.config.musicEmojiSuccess} | Please provide a valid mode: \`off\`, \`song\`, or \`queue\``)
        
            return message.channel.send({ embeds: [embed2], ephemeral: true })
        }
        
        switch (args[0]) {
            case 'off':
                mode = 0
                break
            case 'song':
                mode = 1
                break
            case 'queue':
                mode = 2
                break
        }
        
        mode = queue.setRepeatMode(mode)
        mode = mode ? (mode === 2 ? 'Repeat queue' : 'Repeat song') : 'Off'
        
        const embed1 = new EmbedBuilder()
            .setColor(client.config.embedMusic)
            .setTitle(`> Music System | Repeat ${client.config.arrowEmoji}`)
            .setDescription(`${client.config.musicEmojiRepeat} | Set repeat mode to \`${mode}\``)
            .setTimestamp()

    message.channel.send({ embeds: [embed1] })
  }
}
