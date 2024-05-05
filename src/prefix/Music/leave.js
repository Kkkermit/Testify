module.exports = {
  name: 'leave',
  aliases: ['l'],
  run: async (client, message) => {
    client.distube.voices.leave(message)
  }
}
