const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Role management tool')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(command => command.setName('add').setDescription('Add a role to a member').addUserOption(option => option.setName('member').setDescription('Select a member to assign a role to').setRequired(true)).addRoleOption(option => option.setName('role').setDescription('Select the role to assign to the member').setRequired(true)))
    .addSubcommand(command => command.setName('remove').setDescription('Remove a role from a member').addUserOption(option => option.setName('member').setDescription('Select a member to remove a role from').setRequired(true)).addRoleOption(option => option.setName('role').setDescription('Select the role to remove from the member').setRequired(true))),
    async execute(interaction, client) {

        const sub = interaction.options.getSubcommand();
        switch (sub) {
            case 'add':

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
            .setTitle(`>  ${client.config.modEmojiLight} ${client.user.username} Role Assignment ${client.config.arrowEmoji}`)
            .setColor(client.config.embedModLight)
            .setDescription(`> Successfully assigned the role **<@&${role.id}>** to **${member.user.username}**`)
            .setThumbnail(client.user.avatarURL())
            .setFooter({ text: `Role assigned by ${interaction.user.username}` })
            .setTimestamp()

            await interaction.reply({ embeds: [embed] });

            break;
            case 'remove':

            const memberRemove = interaction.options.getMember('member');
            const roleRemove = interaction.options.getRole('role');

            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true});

            if (interaction.member.roles.cache.has(roleRemove.id)) {
                return interaction.reply({ content: `An error has occurred. This can happen when the user **does not** have the role or the role your trying to remove is **higher than ${client.user.username}'s top role.** Please adjust this and try again.`, ephemeral: true });
            } else {
                memberRemove.roles.remove(roleRemove).catch(console.error);
            }

            const embedRemoveRole = new EmbedBuilder()
            .setColor(client.config.embedModLight)
            .setAuthor({ name: `Remove Role Command ${client.config.devBy}` })
            .setTitle(`${client.user.username} Remove Role Tool ${client.config.arrowEmoji}`)
            .setDescription(`> Removed <@&${roleRemove.id}> from ${memberRemove}`)
            .setFooter({ text: `Role removed by ${interaction.user.username}` })
            .setThumbnail(client.user.displayAvatarURL())
            .setTimestamp();

            await interaction.reply({ embeds: [embedRemoveRole] });
        }
    }
}