const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, PermissionFlagsBits, MessageFlags } = require('discord.js')

module.exports = {
    usableInDms: false,
    category: "Moderation",
    permissions: [PermissionFlagsBits.ModerateMembers],
    data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a server member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option => option.setName('target').setDescription('The user you would like to untimeout').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('The reason for untiming out the user').setRequired(false)),
    async execute(interaction, client) {

        const timeUser = interaction.options.getUser('target');
        const timeMember = await interaction.guild.members.fetch(timeUser.id);
        const user = interaction.options.getUser('user') || interaction.user;

        if (!timeMember.kickable) return interaction.reply({ content: 'I **cannot** timeout this user! This is either because their role is **higher** then me or you.', flags: MessageFlags.Ephemeral})
        if (interaction.member.id === timeMember.id) return interaction.reply({content: "You **cannot** use the \`\`unmute\`\` command on yourself...", flags: MessageFlags.Ephemeral})
        if (timeMember.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({content: "You **cannot** untimeout staff members or people with the **Administrator** permission!", flags: MessageFlags.Ephemeral})

        let reason = interaction.options.getString('reason');
        if (!reason) reason = "\`\`Reason for timeout not given\`\`"

        await timeMember.timeout(null, reason)

            const minEmbed = new EmbedBuilder()
            .setColor(client.config.embedModHard)
            .setAuthor({ name: `${client.user.username} untimeout command ${client.config.devBy}`})
            .setTitle(`> ${client.config.modEmojiHard}  User was **untimed-out** in "${interaction.guild.name}"  ${client.config.arrowEmoji}`)
            .setDescription(`${timeUser.tag}'s timeout has been **removed** by ${user.tag}`)
            .addFields({ name: 'User', value: `> ${timeUser.tag}`, inline: true})
            .addFields({ name: 'Reason', value: `> ${reason}`, inline: true})
            .setThumbnail(client.user.avatarURL())
            .setFooter({ text: `Someone was unmuted`})
            .setTimestamp()

            const dmEmbed = new EmbedBuilder()
            .setColor(client.config.embedModHard)
            .setAuthor({ name: `${client.user.username} untimeout Tool`})
            .setTitle(`> ${client.config.modEmojiHard}  You were **untimed-out** in "${interaction.guild.name}"  ${client.config.arrowEmoji}`)
            .addFields({ name: 'Server', value: `> ${interaction.guild.name}`, inline: true})
            .addFields({ name: 'Reason', value: `> ${reason}`, inline: true})
            .setFooter({ text: `Untimed-out from ${interaction.guild.name} ${client.config.devBy}`})
            .setTimestamp()
            .setThumbnail(client.user.avatarURL())

            await timeMember.send({ embeds: [dmEmbed] }).catch((err) => { return client.logs.error("[UNMUTE] Failed to DM user. This can happen when their DM's are off, or the user is a bot.") });
            await interaction.reply({ embeds: [minEmbed] })
    },
}