const { EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");

module.exports = {
    name: 'kick',
    aliases: ['boot'],
    description: 'Kick a user from the server',
    usage: 'kick <user> [reason]',
    category: 'Moderation',
    usableInDms: false,
    permissions: [PermissionFlagsBits.KickMembers],
    async execute(message, client, args) {

        const user = message.guild.members.cache.get(args[1]) || message.mentions.members.first() 

        if (!user) return message.channel.send({ content: 'Please mention a **user** to kick.', flags: MessageFlags.Ephemeral });

        const reason = args.slice(1).join(' ') || `\`\`No reason given\`\``;

        if (user.id === client.user.id) return message.channel.send({ content: 'You cannot kick me from the server', flags: MessageFlags.Ephemeral });
        if (user.id === message.member.id) return message.channel.send({ content: 'You cannot kick yourself from the server', flags: MessageFlags.Ephemeral });

        if (user.kickable) {

            const dmEmbed = new EmbedBuilder()
            .setAuthor({ name: `${client.user.username} kick command` })
            .setColor(client.config.embedModHard)
            .setTitle(`> ${client.config.modEmojiHard}  Kick command ${client.config.arrowEmoji}`)
            .setDescription(`\n ${user}, \n \`You have been kicked from ${message.channel.guild}\` \n \n \n **Reason:** \n ${reason} \n \n **Staff Member:** \n ${message.member} | (<@${message.member.id}>:${message.member.id}) \n`)
            .setTimestamp()
            .setThumbnail(client.user.avatarURL())
            .setFooter({ text: `Kicked - ${message.channel.guild} ${client.config.devBy}` });
    
            user.send({ embeds: [dmEmbed] }).catch((err) => { return client.logs.error("[KICK] Failed to DM user. This can happen when their DM's are off, or the user is a bot.") });
            user.kick({ reason: reason })

            const kickEmbed = new EmbedBuilder()
            .setAuthor({ name: `${client.user.username} kick command`})
            .setTitle(`> ${client.config.modEmojiHard}  Kick command ${client.config.arrowEmoji}`)
            .setColor(client.config.embedModHard)
            .addFields({ name: 'User', value: `> ${user}`, inline: true })
            .addFields({ name: 'Reason', value: `> ${reason}`, inline: true })
            .setFooter({ text: `Someone got kicked from the server` })
            .setThumbnail(client.user.avatarURL())
            .setTimestamp()

            message.channel.send({ embeds: [kickEmbed]})

        } else {
            const Failed = new EmbedBuilder()
            .setDescription(`Failed to kick **${user}**!`)
            .setColor(client.config.embedModHard)
            message.channel.send({ embeds: [Failed], flags: MessageFlags.Ephemeral}).catch(err => {
                return;
            });
        }
    }
}