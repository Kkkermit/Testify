const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
    .setName("permissions")
    .setDescription("Displays permissions of given user.")
    .addUserOption(option => option.setName("user").setDescription("The user to get permissions for").setRequired(false)),
    
    async execute(interaction, client) {

        const { options } = interaction;

        const member = options.getMember("user") || interaction.member;
        const user = options.getUser("user") || interaction.user;

        if (!member) return interaction.reply({ content: "Member **could not** be found!", ephemeral: true,});
  
        let permissionFlags = Object.keys(PermissionFlagsBits);

        let output = `• Permissions for **${member}**  \n\`\`\``;
        for (let i = 0; i < permissionFlags.length; i++) {
            let permissionName = permissionFlags[i];
            let hasPermission = member.permissions.has(permissionName);
            output += `${permissionName} ${hasPermission ? "✅" : "❌"}\n`;
        }
        output += `\`\`\``;
        
        const PermsEmbed = new EmbedBuilder()
        .setTitle(`${client.user.username} Permissions Tracker ${client.config.arrowEmoji}`)
        .setAuthor({ name: `Permissions Tracker ${client.config.devBy}`})
        .setDescription(`> **${user.tag}** permissions in **${interaction.guild.name}** \n\n${output}`)
        .setColor(client.config.embedInfo)
        .setThumbnail(user.avatarURL())
        .setFooter({ text: `${user.tag} permissions`})
        .setTimestamp();
        
        return interaction.reply({ embeds: [PermsEmbed] });
    },
};