module.exports = {
  name: 'previous',
  inVoiceChannel: true,
  async execute(message, client, args) {
    const queue = client.distube.getQueue(message)
    if (!queue) return message.channel.send(`${client.emotes.error} | There is nothing in the queue right now!`)
    const song = queue.previous()
    message.channel.send(`${client.emotes.success} | Now playing:\n${song.name}`)
  }
}
