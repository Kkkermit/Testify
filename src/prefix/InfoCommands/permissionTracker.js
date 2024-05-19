const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'perms',
    aliases: ['permissions'],
    async execute(message, client, args) {

        const user = message.guild.members.cache.get(args[1]) || message.mentions.members.first();

        if (!user) return message.channel.send({ content: "Member **could not** be found!", ephemeral: true,});

        let permissionFlags = Object.keys(PermissionFlagsBits);

        let output = `• Permissions for **${user}**  \n\`\`\``;
        for (let i = 0; i < permissionFlags.length; i++) {
            let permissionName = permissionFlags[i];
            let hasPermission = user.permissions.has(permissionName);
            output += `${permissionName} ${hasPermission ? "✅" : "❌"}\n`;
        }
        output += `\`\`\``;
        
        const PermsEmbed = new EmbedBuilder()
        .setTitle(`${client.user.username} Permissions Tracker ${client.config.arrowEmoji}`)
        .setAuthor({ name: `Permissions Tracker ${client.config.devBy}`})
        .setDescription(`> **${user}** permissions in **${message.guild.name}** \n\n${output}`)
        .setColor(client.config.embedInfo)
        .setThumbnail(user.avatarURL())
        .setFooter({ text: `${user} permissions`})
        .setTimestamp();

        await message.channel.send({ embeds: [PermsEmbed] });
    }
}