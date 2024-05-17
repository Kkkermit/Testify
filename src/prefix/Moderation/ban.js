const { EmbedBuilder, PermissionsBitField } = require("discord.js")

module.exports = {
    name: 'ban',
    async execute(message, client, args)  {
        const user = message.guild.members.cache.get(args[1]) || message.mentions.members.first() 

        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return await message.channel.send({ content: `${client.config.noPerms}`, ephemeral: true});
        if (!user) return message.channel.send({ content: `You need to mention a **user** to ban!`, ephemeral: true})
        const reason = args.slice(1).join(' ') || '\`\`No reason provided\`\`'

        try {
            await user.ban([reason])

            const banSuccess = new EmbedBuilder()
            .setAuthor({ name: `${client.user.username} ban command ${client.config.devBy}` })
            .setColor(client.config.embedModHard)
            .setTitle(`> ${client.config.modEmojiHard}  Ban command ${client.config.arrowEmoji}`)
            .addFields({ name: 'User', value: `> ${user}`, inline: true})
            .addFields({ name: 'Reason', value: `> ${reason}`, inline: true})
            .setTimestamp()
            .setThumbnail(client.user.avatarURL())
            .setFooter({ text: `Someone got got struck by the ban hammer` })

            message.channel.send({ embeds : [banSuccess] }).catch(err => {
                return;
            });

        } catch (error) {
            console.log(error)
            message.channel.send({ content: `Failed to ban **${user}**!`, ephemeral: true}).catch(err => {
                return;
            });
        } try {

            const dmEmbed = new EmbedBuilder()
            .setAuthor({ name: `${client.user.username} ban command` })
            .setColor(client.config.embedModHard)
            .setTitle(`> ${client.config.modEmojiHard}  Ban command ${client.config.arrowEmoji}`)
            .setDescription(`\n ${user}, \n \`You have been banned from ${message.channel.guild}\` \n \n \n **Reason:** \n ${reason} \n \n **Staff Member:** \n ${message.member} | (<@${message.member.id}>:${message.member.id}) \n`)
            .setTimestamp()
            .setThumbnail(client.user.avatarURL())
            .setFooter({ text: `Banned - ${message.channel.guild} ${client.config.devBy}` });

            message.user.send({ embeds: [dmEmbed] }).catch(err => {
                return;
            });
        } catch (error) {
            console.log(error)

            const dmFailed = new EmbedBuilder()
            .setDescription(`Could not DM **${user}**!`)
            .setColor(client.config.embedModHard)

            message.channel.send({ embeds: [dmFailed], ephemeral: true}).catch(err => {
                return;
            });
        }
    }
}