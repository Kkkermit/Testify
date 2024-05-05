module.exports = {
  name: 'nowplaying',
  aliases: ['np'],
  inVoiceChannel: true,
  async execute(message, client, args) {
    const queue = client.distube.getQueue(message)
    if (!queue) return message.channel.send(` | There is nothing in the queue right now!`)
    const song = queue.songs[0]
    message.channel.send(` | I'm playing **\`${song.name}\`**, by ${song.user}`)
  }
}
