const { EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");

module.exports = {
    name: 'nick',
    aliases : ['nickname'],
    description: 'Change a user\'s nickname',
    usage: 'nick <user> <nickname>',
    category: 'Moderation',
    usableInDms: false,
    permissions: [PermissionFlagsBits.ManageNicknames],
    async execute(message, client, args) {

        const user = message.guild.members.cache.get(args[1]) || message.mentions.members.first() 
        const nickname = args.slice(1).join(' ');

        if (!user) return message.channel.send({ content: 'Please mention a **user** to change their nickname.', flags: MessageFlags.Ephemeral });
        if (!nickname) return message.channel.send({ content: 'Please provide a **nickname** to change.', flags: MessageFlags.Ephemeral });

        user.setNickname(nickname);

        const nickEmbed = new EmbedBuilder()
        .setAuthor({ name: `${client.user.username} nick command`})
        .setTitle(`> ${client.config.modEmojiLight}  Nick command ${client.config.arrowEmoji}`)
        .setColor(client.config.embedModLight)
        .addFields({ name: 'User', value: `> ${user}`, inline: true })
        .addFields({ name: 'Nickname', value: `> ${nickname}`, inline: true })
        .setFooter({ text: `Someone got their nickname changed` })
        .setThumbnail(client.user.avatarURL())
        .setTimestamp()

        message.channel.send({ embeds: [nickEmbed]});
    }
}