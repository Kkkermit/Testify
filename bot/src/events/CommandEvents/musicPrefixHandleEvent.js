const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {

        if (message.author.bot || !message.guild) return

        const prefix = client.config.prefix

        if (!message.content.startsWith(prefix)) return

        const args = message.content.slice(prefix.length).trim().split(/ +/g)
        const command = args.shift().toLowerCase()
        const cmd = client.pcommands.get(command) || client.pcommands.get(client.aliases.get(command))
        if (!cmd) return

        const noVoiceChannel = new EmbedBuilder()
            .setColor(client.config.embedMusic)
            .setDescription(`${client.config.musicEmojiError} | You **must** be in a voice channel!`)

        if (cmd.inVoiceChannel && !message.member.voice.channel) {
            return message.channel.send({ embeds: [noVoiceChannel] })
        }
        try {
        } catch {
            message.channel.send(`${client.config.musicEmojiError} | Error: \`${error}\``)
        }
    }
}