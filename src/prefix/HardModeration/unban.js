const { EmbedBuilder, PermissionFlagsBits } = require("discord.js")

module.exports = {
    name: 'unban',
    async execute(message, client, args) {
        const userID = args[0];
        const user = client.users.cache.get(userID);

        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return await message.channel.send({ content: `${client.config.noPerms}`, ephemeral: true});
        if (!user) return message.channel.send({ content: `You need to provide a valid **user ID** to unban!`, ephemeral: true})
        
        const reason = args.slice(1).join(' ') || '\`\`No reason provided\`\`'

        const embed = new EmbedBuilder()
        .setAuthor({ name: `${client.user.username} unban command ${client.config.devBy}` })
        .setColor(client.config.embedModHard)
        .setTitle(`> ${client.config.modEmojiHard}  Unban command ${client.config.arrowEmoji}`)
        .addFields({ name: 'User', value: `> ${user.tag}`, inline: true})
        .addFields({ name: 'Reason', value: `> ${reason}`, inline: true})
        .setTimestamp()
        .setThumbnail(client.user.avatarURL())
        .setFooter({ text: `Someone made friends with the ban hammer` });

        const bans = await message.guild.bans.fetch();

        if (bans.size == 0) return await message.channel.send({ content: 'There is **no one** to unban.', ephemeral: true})
        let bannedUser = bans.find(ban => ban.user.id == userID);
        if (!bannedUser) return await message.channel.send({ content: 'That user **is not** banned.', ephemeral: true})

        await message.guild.bans.remove(user, reason).catch(err => {
            return message.channel.send({ content: `**Couldn't** unban user specified!`, ephemeral: true})
        })

        await message.channel.send({ embeds: [embed] });
    }
}