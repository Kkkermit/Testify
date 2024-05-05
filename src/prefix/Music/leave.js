module.exports = {
  name: 'leave',
  aliases: ['l'],
  async execute(message, client, args) {
    client.distube.voices.leave(message)
  }
}
