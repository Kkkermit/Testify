const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a user from the server')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option => option.setName('user').setDescription('The user to be banned').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('The reason for the ban').setRequired(false)),
    async execute(interaction, client) {

        const userID = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || '\`\`Reason for ban not given\`\`';

        let guild = await interaction.guild.fetch();
        
        const dmEmbed = new EmbedBuilder()
        .setAuthor({ name: `${client.user.username} ban command` })
        .setColor(client.config.embedModHard)
        .setTitle(`> ${client.config.modEmojiHard}  Ban command ${client.config.arrowEmoji}`)
        .setDescription(`\n ${userID.tag}, \n \`You have been banned from ${guild.name}\` \n \n \n **Reason:** \n ${reason} \n \n **Staff Member:** \n ${interaction.user.tag} | (<@${interaction.user.id}>:${interaction.user.id}) \n`)
        .setTimestamp()
        .setThumbnail(client.user.avatarURL())
        .setFooter({ text: `Banned - ${interaction.guild.name} ${client.config.devBy}` });
    
        const banEmbed = new EmbedBuilder()
        .setAuthor({ name: `${client.user.username} ban command ${client.config.devBy}` })
        .setColor(client.config.embedModHard)
        .setTitle(`> ${client.config.modEmojiHard}  Ban command ${client.config.arrowEmoji}`)
        .addFields({ name: 'User', value: `> ${userID.tag}`, inline: true})
        .addFields({ name: 'Reason', value: `> ${reason}`, inline: true})
        .setTimestamp()
        .setThumbnail(client.user.avatarURL())
        .setFooter({ text: `Someone got got struck by the ban hammer` })
    
        const perm = interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers);
        if (interaction.member.id === userID) return await interaction.reply({ content: 'You **cannot** use the \`\`ban\`\` command on yourself...', ephemeral: true });
        if (!perm)
            return await interaction.channel.sendTyping(),
            interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true });

        await userID.send({ embeds: [dmEmbed] }).catch((err) => { return client.logs.error("[BAN] Failed to DM user. This can happen when their DM's are off, or the user is a bot.") });

        let ban = await guild.members.ban(userID, { reason: `${interaction.user.tag} - ${reason}` }).catch((err) => { client.logs.error("[BAN_ERROR] Error with Ban command: " + err) })
        if (ban) {
            await interaction.channel.sendTyping(),
            await interaction.reply({ embeds: [banEmbed] })
        } else if (!ban) {
            interaction.reply({ content: `Failed to ban **${userID.tag}** from **${guild.name}**`, ephemeral: true })
        }
    }
}