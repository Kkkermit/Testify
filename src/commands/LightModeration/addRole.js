const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('give-role')
    .setDescription('Give roles to members')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(option => option.setName('member').setDescription('Select a member to assign a role to').setRequired(true))
    .addRoleOption(option => option.setName('role').setDescription('Select the role to assign to the member').setRequired(true)),
    async execute(interaction, client) {

        const member = interaction.options.getMember('member');
        const role = interaction.options.getRole('role');

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true });
        }

        if (interaction.member.roles.cache.has(role.id)) {
            return interaction.reply({ content: 'Member already has that role!', ephemeral: true });
        }
        else {
            member.roles.add(role).catch(console.error);
        }

        const embed = new EmbedBuilder()
        .setAuthor({ name: `Give Role Command ${client.config.devBy}`})
        .setTitle(`${client.user.username} Role Assignment ${client.config.arrowEmoji}`)
        .setColor(client.config.embedModLight)
        .setDescription(`> Successfully assigned the role **<@&${role.id}>** to **${member.user.username}**`)
        .setThumbnail(client.user.avatarURL())
        .setFooter({ text: `Role assignment` })
        .setTimestamp()

        await interaction.reply({ embeds: [embed] });
    }
}