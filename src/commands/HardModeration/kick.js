const { EmbedBuilder, PermissionsBitField, SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    usableInDms: false,
    category: "Moderation",
    permissions: [PermissionFlagsBits.KickMembers],
    data: new SlashCommandBuilder()
    .setName('kick')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDescription('Kicks specified user.')
    .addUserOption(option => option.setName('user').setDescription('Specify the user you want to kick.').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason as to why you want to kick specified user.').setRequired(false)),
    async execute(interaction, client) {
        
        const users = interaction.options.getUser('user');
        const ID = users.id;
        const kickedmember = interaction.options.getMember('user');

        if (interaction.member.id === ID) return await interaction.reply({ content: 'You **cannot** use the \`\`kick\`\` command on yourself...', flags: MessageFlags.Ephemeral});

        if (!kickedmember) return await interaction.reply({ content: `That user **does not** exist within your server.`, flags: MessageFlags.Ephemeral});
    
        const reason = interaction.options.getString('reason') || '\`\`Reason for kick not given\`\`';
        
        const dmEmbed = new EmbedBuilder()
        .setColor(client.config.embedModHard)
        .setAuthor({ name: `${client.user.username} Kick Tool`})
        .setTitle(`> ${client.config.modEmojiHard}  You were kicked from "${interaction.guild.name}"  ${client.config.arrowEmoji}`)
        .addFields({ name: 'Server', value: `> ${interaction.guild.name}`, inline: true})
        .addFields({ name: 'Reason', value: `> ${reason}`, inline: true})
        .setFooter({ text: `Kicked from ${interaction.guild.name} ${client.config.devBy}`})
        .setTimestamp()
        .setThumbnail(client.user.avatarURL())

        const embed = new EmbedBuilder()
        .setColor(client.config.embedModHard)
        .setAuthor({ name: `${client.user.username} kick command ${client.config.devBy}`})
        .setTitle(`> ${client.config.modEmojiHard}  User was kicked from "${interaction.guild.name}"  ${client.config.arrowEmoji}`)
        .addFields({ name: 'User', value: `> ${users.tag}`, inline: true})
        .addFields({ name: 'Reason', value: `> ${reason}`, inline: true})
        .setThumbnail(client.user.avatarURL())
        .setFooter({ text: `Someone got kicked hard`})
        .setTimestamp()

        await kickedmember.send({ embeds: [dmEmbed] }).catch((err) => { return client.logs.error("[KICK] Failed to DM user. This can happen when their DM's are off, or the user is a bot.") });

        await kickedmember.kick().catch(err => {
            return interaction.reply({ content: `**Couldn't** kick this member! Check my **role position** and try again.`, flags: MessageFlags.Ephemeral});
        })

        await interaction.reply({ embeds: [embed] });
    }
}