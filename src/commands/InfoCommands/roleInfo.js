const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('role-info')
    .setDescription('Retrieve info about a given role :)')
    .addRoleOption(option => option.setName('role').setDescription("The role you want to get the info of").setRequired(true)),
    async execute(interaction, client) {
    
        const { options } = interaction;
        
        const role = options.getRole('role');
        
        if (!role || !role.id) return interaction.reply({ content: `That role **doesn't** seem to exist in ${interaction.guild.name}`, ephemeral: true});
        if (role.name === "@everyone") return interaction.reply({ content: `You **cannot** get the info of the \`\`@everyone\`\``, ephemeral: true});
        if (role.name === "@here") return interaction.reply({ content: `You **cannot** get the info of the \`\`@here\`\``, ephemeral: true});
        
        const created = parseInt(role.createdTimestamp / 1000);
        const isMentionable = role.isMentionable ? "true" : "false";
        const isManaged = role.isManaged ? "true" : "false";
        const isHigher = role.isHigher ? "true" : "false";
        const position = role.position;
        const isBotRole = role.isBotRole ? "true" : "false";
        
        const roleEmbed = new EmbedBuilder()
        .setAuthor({ name: `${client.user.username} role info ${client.config.devBy}`})
        .setColor(role.color)
        .setTitle(`🔍 **Role info** ${client.config.arrowEmoji}`)
        .addFields(
            { name: "Name", value: `> ${role.name}` },
            { name: "Color", value: `> ${role.hexColor}` },
            { name: "Mention", value: `> \`<@&${role.id}>\`` },
            { name: "Hoisted", value: `> ${isHigher}` },
            { name: "Position", value: `> ${position}` },
            { name: "Mentionable", value: `> ${isMentionable}` },
            { name: "Managed", value: `> ${isManaged}` },
            { name: "Bot-Role", value: `> ${isBotRole}` },
            { name: "Created", value: `> <t:${created}:R>` })
        .setFooter({ text: `Role ID: ${role.id} | Role info command`})
        .setThumbnail()
        
        await interaction.reply({ embeds: [roleEmbed] })
    
    }
} 