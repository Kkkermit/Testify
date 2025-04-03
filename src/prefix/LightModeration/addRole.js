const { EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");

module.exports = {
    name: 'addrole',
    aliases : ['add-role'],
    async execute(message, client, args) {

        const user = message.guild.members.cache.get(args[1]) || message.mentions.members.first() 
        const role = message.guild.roles.cache.get(args[2]) || message.mentions.roles.first();
        
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.channel.send({ content: `${client.config.noPerms}`, flags: MessageFlags.Ephemeral });
        if (!user) return message.channel.send({ content: 'Please mention a **user** to assign a role to.', flags: MessageFlags.Ephemeral });
        if (!role) return message.channel.send({ content: 'Please mention a **role** to assign to the user.', flags: MessageFlags.Ephemeral });

        if (user.roles.cache.has(role.id)) {
            return message.channel.send({ content: 'User already has that role!', flags: MessageFlags.Ephemeral });
        }
        else {
            user.roles.add(role).catch(err => {
                return message.channel.send({ content: `**Couldn't** add that role! **Check** my permissions and **role position** and try again.`, flags: MessageFlags.Ephemeral });
            })
        }

        const roleEmbed = new EmbedBuilder()
        .setAuthor({ name: `Give Role Command ${client.config.devBy}`})
        .setTitle(`> ${client.config.modEmojiLight} ${client.user.username} Role Assignment ${client.config.arrowEmoji}`)
        .setColor(client.config.embedModLight)
        .setDescription(`> Successfully assigned the role **<@&${role.id}>** to **${user.user.username}**`)
        .setFooter({ text: `Role assigned by ${message.author.tag}` })
        .setThumbnail(client.user.avatarURL())
        .setTimestamp()

        message.channel.send({ embeds: [roleEmbed]});
    }
}