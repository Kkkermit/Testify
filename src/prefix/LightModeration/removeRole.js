const { EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");

module.exports = {
    name: "removerole",
    aliases: ["rrole"],
    description: "Remove a role from a user",
    usage: "removerole <user> <role>",
    category: "Moderation",
    usableInDms: false,
    permissions: [PermissionFlagsBits.ManageRoles],
    async execute(message, client, args) {

        const user = message.guild.members.cache.get(args[1]) || message.mentions.members.first();
        const role = message.guild.roles.cache.get(args[2]) || message.mentions.roles.first();
        
        if (!user) return message.channel.send({ content: 'Please mention a **user** to remove a role from.', flags: MessageFlags.Ephemeral });
        if (!role) return message.channel.send({ content: 'Please mention a **role** to remove.', flags: MessageFlags.Ephemeral });

        user.roles.remove(role).catch(err => {
            return interaction.reply({ content: `**Couldn't** remove that role! **Check** my permissions and **role position** and try again.`, flags: MessageFlags.Ephemeral });
        })

        const roleEmbed = new EmbedBuilder()
        .setColor(client.config.embedModLight)
        .setAuthor({ name: `Remove Role Command ${client.config.devBy}` })
        .setTitle(`${client.user.username} Remove Role Tool ${client.config.arrowEmoji}`)
        .setDescription(`> Removed <@&${role.id}> from ${user}`)
        .setFooter({ text: `Role removed by ${message.author.tag}` })
        .setThumbnail(client.user.displayAvatarURL())
        .setTimestamp();

        message.channel.send({ embeds: [roleEmbed]});
    }
}