const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    usableInDms: false,
    category: "Moderation",
    permissions: [PermissionFlagsBits.BanMembers],
    data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a user from the server')
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
    
        if (userID.id === client.user.id) return interaction.reply({ content: `You cannot ban me from the server`, flags: MessageFlags.Ephemeral });

        await userID.send({ embeds: [dmEmbed] }).catch((err) => { return client.logs.error("[BAN] Failed to DM user. This can happen when their DM's are off, or the user is a bot.") });

        let ban = await guild.members.ban(userID, { reason: `${interaction.user.tag} - ${reason}` }).catch((err) => { client.logs.error("[BAN_ERROR] Error with Ban command: " + err) })
        if (ban) {
            await interaction.channel.sendTyping(),
            await interaction.reply({ embeds: [banEmbed] })
        } else if (!ban) {
            interaction.reply({ content: `Failed to ban **${userID.tag}** from **${guild.name}**`, flags: MessageFlags.Ephemeral })
        }
    }
}