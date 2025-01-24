const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'avatar',
    description: 'Get a users server/main avatar',
    aliases: ["pfp"],
    execute: async function (message, client, args) {
        
        let user, embed;

        switch (args[0]) {
            case 'get':
                user = message.guild.members.cache.get(args[1]) || message.mentions.members.first() || message.member;
                embed = new EmbedBuilder()
                .setTitle('Server Avatar')
                .setImage(user.displayAvatarURL({ size: 4096 }))
                .setAuthor({ name: `${user.user.tag}`, iconURL: user.displayAvatarURL() })
                .setTimestamp()
                message.channel.send({ embeds: [embed] })
            break;
            case 'guild':
                user = message.guild.members.cache.get(args[1]) || message.mentions.members.first() || message.member;
                const user2 = message.guild.members.cache.get(args[0]) || message.mentions.members.first() || message.author;
                if (user.displayAvatarURL() == user2.displayAvatarURL()) return message.channel.send({ embeds: [new EmbedBuilder().setColor(client.config.embedError).setDescription(`<:error:1205124558638813194> does not have a server avatar.`)], ephemeral: true });
                embed = new EmbedBuilder()
                .setTitle('Server Avatar')
                .setImage(user.displayAvatarURL({ size: 4096 }))
                .setAuthor({ name: `${user.user.tag}`, iconURL: user.displayAvatarURL() })
                .setTimestamp()
                message.channel.send({ embeds: [embed] })
            break;
            case 'user':
                user = message.guild.members.cache.get(args[1]) || message.mentions.members.first() || message.author;
                embed = new EmbedBuilder()
                .setTitle('User Avatar')
                .setImage(user.displayAvatarURL({ size: 4096 }))
                .setAuthor({ name: `${user.tag}`, iconURL: user.displayAvatarURL() })
                .setTimestamp()
                message.channel.send({ embeds: [embed] })
            break;
            default:
                user = message.guild.members.cache.get(args[0]) || message.mentions.members.first() || message.member;
                embed = new EmbedBuilder()
                .setTitle('Server Avatar')
                .setImage(user.displayAvatarURL({ size: 4096 }))
                .setAuthor({ name: `${user.user.tag}`, iconURL: user.displayAvatarURL() })
                .setTimestamp()
                message.channel.send({ embeds: [embed] })
            break;
        }
    }
}