const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, PermissionFlagsBits, MessageFlags } = require('discord.js')

module.exports = {
    usableInDms: false,
    category: "Moderation",
    permissions: [PermissionFlagsBits.ModerateMembers],
    data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Times out a server member.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option => option.setName('target').setDescription('The user you would like to time out').setRequired(true))
    .addStringOption(option => option.setName('duration').setRequired(true).setDescription('The duration of the timeout')
        .addChoices(
            { name: '60 Secs', value: '60' },
            { name: '2 Minutes', value: '120' },
            { name: '5 Minutes', value: '300' },
            { name: '10 Minutes', value: '600' },
            { name: '15 Minutes', value: '900' },
            { name: '20 Minutes', value: '1200' },
            { name: '30 Minutes', value: '1800' },
            { name: '45 Minutes', value: '2700' },
            { name: '1 Hour', value: '3600' },
            { name: '2 Hours', value: '7200' },
            { name: '3 Hours', value: '10800' },
            { name: '5 Hours', value: '18000' },
            { name: '10 Hours', value: '36000' },
            { name: '1 Day', value: '86400' },
            { name: '2 Days', value: '172800' },
            { name: '3 Days', value: '259200' },
            { name: '5 Days', value: '432000' },
            { name: 'One Week', value: '604800'}
        )
    )
    .addStringOption(option => option.setName('reason').setDescription('The reason for timing out the user').setRequired(false)),
    async execute(interaction, client) {

        const timeUser = interaction.options.getUser('target');
        const timeMember = await interaction.guild.members.fetch(timeUser.id);
        const channel = interaction.channel;
        const duration = interaction.options.getString('duration');
        const user = interaction.options.getUser('user') || interaction.user;

        if (!timeMember) return await interaction.reply({ content: 'The **user** mentioned is no longer within the server.', flags: MessageFlags.Ephemeral})
        if (!timeMember.kickable) return interaction.reply({ content: 'I **cannot** timeout this user! This is either because their **higher** then me or you.', flags: MessageFlags.Ephemeral})
        if (!duration) return interaction.reply({content: 'You **must** set a valid duration for the timeout', flags: MessageFlags.Ephemeral})
        if (interaction.member.id === timeMember.id) return interaction.reply({content: "You **cannot** use the \`\`mute\`\` command on yourself...", flags: MessageFlags.Ephemeral})
        if (timeMember.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({content: "You **cannot** timeout staff members or people with the Administrator permission!", flags: MessageFlags.Ephemeral})

        let reason = interaction.options.getString('reason');
        if (!reason) reason = "\`\`Reason for timeout not given\`\`"

        await timeMember.timeout(duration * 1000, reason)

            const minEmbed = new EmbedBuilder()
            .setColor(client.config.embedModHard)
            .setAuthor({ name: `${client.user.username} timeout command ${client.config.devBy}`})
            .setTitle(`> ${client.config.modEmojiHard}  User was **timed-out** in "${interaction.guild.name}"  ${client.config.arrowEmoji}`)
            .addFields({ name: 'User', value: `> ${user.tag}`, inline: true})
            .addFields({ name: 'Reason', value: `> ${reason}`, inline: true})
            .addFields({ name: 'Duration', value: `> ${duration / 60}`, inline: true})
            .setThumbnail(client.user.avatarURL())
            .setFooter({ text: `Someone was muted`})
            .setTimestamp()

            const dmEmbed = new EmbedBuilder()
            .setColor(client.config.embedModHard)
            .setAuthor({ name: `${client.user.username} timeout Tool`})
            .setTitle(`> ${client.config.modEmojiHard}  You were **timed-out** in "${interaction.guild.name}"  ${client.config.arrowEmoji}`)
            .addFields({ name: 'Server', value: `> ${interaction.guild.name}`, inline: true})
            .addFields({ name: 'Reason', value: `> ${reason}`, inline: true})
            .addFields({ name: 'Duration', value: `> ${duration / 60}`, inline: true})
            .setFooter({ text: `Timed-out from ${interaction.guild.name} ${client.config.devBy}`})
            .setTimestamp()
            .setThumbnail(client.user.avatarURL())

            await timeMember.send({ embeds: [dmEmbed] }).catch((err) => { return client.logs.error("[MUTE] Failed to DM user. This can happen when their DM's are off, or the user is a bot.") });
            await interaction.reply({ embeds: [minEmbed] })
    },
}