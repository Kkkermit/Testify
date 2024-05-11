const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");

module.exports = {
    name: 'serverinfo',
    description: 'Get server info/stats.',
    aliases: ['server', 'guild', 'guildinfo'],
    execute: async function (message, client, args) {
        const guild = (client.config.developers.includes(message.author.id) && args && args.length) ? client.guilds.cache.get(args[0]) : message.channel.guild;

		const owner = client.users.cache.get(guild.ownerId);

		let categories = guild.channels.cache.filter(c => c.type === 4).length;
		let textChannels = guild.channels.cache.filter(c => c.type === 0).length;
		let voiceChannels = guild.channels.cache.filter(c => c.type === 2).length;

        const {
            members,
            emojis,
            roles,
            stickers
        } = guild;
        
        const sortedRoles  = roles.cache.map(role => role).slice(1, roles.cache.size).sort((a, b) => b.position - a.position);
        const userRoles    = sortedRoles.filter(role => !role.managed);
        const managedRoles = sortedRoles.filter(role => role.managed);
        const botCount     = members.cache.filter(member => member.user.bot).size;

        const maxDisplayRoles = (roles, maxFieldLength = 1024) => {
            let totalLength = 0;
            const result = [];

            for (const role of roles) {
                const roleString = `<@&${role.id}>`;

                if (roleString.length + totalLength > maxFieldLength)
                    break;

                totalLength += roleString.length + 1;
                result.push(roleString);
            }

            return result.length;
        }

        const embed = new EmbedBuilder()
        .setColor(client.config.embedInfo)
        .setAuthor({ name: guild.name, iconURL: guild.iconURL() })
        .setThumbnail(guild.iconURL())
        .setTitle(`${client.user.username} Server Info ${client.config.arrowEmoji}`)
        .setTimestamp(new Date(guild.createdAt))
        .addFields({ name: 'Owner', value: `${owner.tag}`, inline: true })
        .addFields({ name: 'Members', value: `${guild.memberCount.toString()}`, inline: true })
        .addFields({ name: `Users (${guild.memberCount})`, value: [ `👨‍👩‍👧‍👦 **Members** ${guild.memberCount - botCount}`, `🤖 **Bots** ${botCount}` ].join("\n"), inline: true })
        .addFields({ name: `User Roles (${maxDisplayRoles(userRoles)} of ${userRoles.length})`, value: `${userRoles.slice(0, maxDisplayRoles(userRoles)).join(" ") || "None"}`})
        .addFields({ name: `Managed Roles (${maxDisplayRoles(managedRoles)} of ${managedRoles.length})`, value: `${managedRoles.slice(0, maxDisplayRoles(managedRoles)).join(" ") || "None"}`})
        .addFields({ name: 'Category Channels', value: categories ? categories.toString() : '0', inline: true })
        .addFields({ name: 'Text Channels', value: textChannels ? textChannels.toString() : '0', inline: true })
        .addFields({ name: 'Voice Channels', value: voiceChannels ? voiceChannels.toString() : '0', inline: true })
        .addFields({ name: 'Emojis', value: emojis.cache.size ? emojis.cache.size.toString() : '0', inline: true })
        .setFooter({ text: `ID: ${guild.id} ${client.config.devBy}` })

        message.channel.send({ embeds: [embed] });
    }
}