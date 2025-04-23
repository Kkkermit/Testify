const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    usableInDms: false,
    category: "Moderation",
    permissions: [PermissionFlagsBits.BanMembers],
    data: new SlashCommandBuilder()
    .setName('unban')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDescription('Unbans specified user.')
    .addUserOption(option => option.setName('user').setDescription('Specify the user you want to ban.').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason as to why you want to unban specified user.').setRequired(false)),
    async execute(interaction, client) {
        
        const userID = interaction.options.getUser('user');

        if (interaction.member.id === userID) return await interaction.reply({ content: 'You **cannot** use the \`\`unban\`\` command on yourself...'});

        let reason = interaction.options.getString('reason');
        if (!reason) reason = '\`\`Reason for unban not given\`\`';

        const embed = new EmbedBuilder()
        .setAuthor({ name: `${client.user.username} unban command ${client.config.devBy}`})
        .setColor(client.config.embedModHard)
        .setTitle(`> ${client.config.modEmojiHard}  Unban command ${client.config.arrowEmoji}`)
        .addFields({ name: 'User', value: `> ${userID}`, inline: true})
        .addFields({ name: 'Reason', value: `> ${reason}`, inline: true})
        .setTimestamp()
        .setThumbnail(client.user.avatarURL())
        .setFooter({ text: `Someone made friends with the ban hammer` });

        await interaction.guild.bans.fetch() 
        .then(async bans => {

            if (bans.size == 0) return await interaction.reply({ content: 'There is **no one** to unban.', flags: MessageFlags.Ephemeral})
            let bannedID = bans.find(ban => ban.user.id == userID);
            if (!bannedID ) return await interaction.reply({ content: 'That user **is not** banned.', flags: MessageFlags.Ephemeral})

            await interaction.guild.bans.remove(userID, reason).catch(err => {
                return interaction.reply({ content: `**Couldn't** unban user specified!`, flags: MessageFlags.Ephemeral})
            })
        })
        await interaction.reply({ embeds: [embed] });
    }
}