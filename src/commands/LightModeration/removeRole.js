const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('remove-role')
    .setDescription('Remove roles from members')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(option => option.setName('member').setDescription('Select a member to remove a role from').setRequired(true))
    .addRoleOption(option => option.setName('role').setDescription('Select the role to remove from the member').setRequired(true)),
    async execute(interaction, client) {

        const member = interaction.options.getMember('member');
        const role = interaction.options.getRole('role');

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true});

        if (interaction.member.roles.cache.has(role.id)) {
            return interaction.reply({ content: `An error has occurred. This can happen when the user **does not** have the role or the role your trying to remove is **higher than ${client.user.username}'s top role.** Please adjust this and try again.`, ephemeral: true });
        } else {
            member.roles.remove(role).catch(console.error);
        }

        const embed = new EmbedBuilder()
        .setColor(client.config.embedModLight)
        .setAuthor({ name: `Remove Role Command ${client.config.devBy}` })
        .setTitle(`${client.user.username} Remove Role Tool ${client.config.arrowEmoji}`)
        .setDescription(`> Removed <@&${role.id}> from ${member}`)
        .setFooter({ text: `Role removed by ${interaction.user.username}` })
        .setThumbnail(client.user.displayAvatarURL())
        .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
}