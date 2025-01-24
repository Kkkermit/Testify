const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionsBitField, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('mod-panel')
    .setDescription('Moderate a member.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option => option.setName("user").setDescription("The user you want to moderate").setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for moderating the member').setRequired(false))
    .addIntegerOption(option => option.setName('time').setDescription('This is how long the user\'s punishment is going to last (in minutes). Default: 1 hour').setRequired(false)),
    async execute (interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true});

        const target = await interaction.options.getUser(`user`);
        const member = await interaction.options.getMember("user")
        const reason = await interaction.options.getString(`reason`) || "\`\`No reason given\`\`";
        const length = await interaction.options.getInteger(`time`) || 60;
        let guild = await interaction.guild.fetch();

        const mod_panel = new EmbedBuilder()
        .setAuthor({ name: `${client.user.username} Mod Panel`})
        .setTitle(`> ${client.config.modEmojiHard} Mod panel tool ${client.config.arrowEmoji}`)
        .setThumbnail(member.displayAvatarURL({ size: 1024, format: `png`, dynamic: true}))
        .addFields({ name: `Target:`, value: `> ${target}`, inline: true })
        .addFields({ name: `Target ID:`, value: `> \`${target.id}\``, inline: true })
        .addFields({ name: `Timeout Length:`, value: `> \`${length} minute(s)\``, inline: true })
        .addFields({ name: `Reason for Punishment:`, value: `> \`${reason}\``, inline: false })
        .setFooter({ text: `Mod panel ${client.config.devBy}`})
        .setTimestamp()
        .setColor(client.config.embedModHard)

        const row_1 = new ActionRowBuilder() 
        .addComponents(
            new ButtonBuilder()
            .setCustomId('timeout')
            .setEmoji('⏳')
            .setLabel('Timeout')
            .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
            .setCustomId('kick')
            .setEmoji('🦵')
            .setLabel('Kick')
            .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
            .setCustomId('ban')
            .setEmoji('🛠️')
            .setLabel('Ban')
            .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
            .setLabel(`Delete`)
            .setCustomId(`delete`)
            .setEmoji('✖️')
            .setStyle(ButtonStyle.Danger))
        
        const failEmbed = new EmbedBuilder()
        .setColor(client.config.embedModHard)
        .setDescription(`Failed to moderate **${target}**.`)
        .setFooter({ text: `${client.user.username} Moderation Tool ${client.config.devBy}` })

        const banEmbed = new EmbedBuilder()
        .setColor(client.config.embedModHard)
        .setAuthor({ name: `${client.user.username} Moderation Tool`})
        .setTitle(`> ${client.config.modEmojiHard}  You were **banned** from "${guild.name}"  ${client.config.arrowEmoji}`)
        .addFields({ name: 'Server', value: `> ${guild.name}`, inline: true})
        .addFields({ name: 'Reason', value: `> ${reason}`, inline: true})
        .setFooter({ text: `Banned from ${guild.name} ${client.config.devBy}`})
        .setTimestamp()
        .setThumbnail(client.user.avatarURL())

        const timeoutEmbed = new EmbedBuilder()
        .setColor(client.config.embedModHard)
        .setAuthor({ name: `${client.user.username} Moderation Tool`})
        .setTitle(`> ${client.config.modEmojiHard}  You were **Timed-out** in "${guild.name}"  ${client.config.arrowEmoji}`)
        .addFields({ name: 'Server', value: `> ${guild.name}`, inline: true})
        .addFields({ name: 'Reason', value: `> ${reason}`, inline: true})
        .addFields({ name: 'Length', value: `> ${length} minute(s)`, inline: true})
        .setFooter({ text: `Timed-out in ${guild.name} ${client.config.devBy}`})
        .setTimestamp()
        .setThumbnail(client.user.avatarURL())

        const kickEmbed = new EmbedBuilder()
        .setColor(client.config.embedModHard)
        .setAuthor({ name: `${client.user.username} Moderation Tool`})
        .setTitle(`> ${client.config.modEmojiHard}  You were **kicked** from "${guild.name}"  ${client.config.arrowEmoji}`)
        .addFields({ name: 'Server', value: `> ${guild.name}`, inline: true})
        .addFields({ name: 'Reason', value: `> ${reason}`, inline: true})
        .setFooter({ text: `Kicked from ${guild.name} ${client.config.devBy}`})
        .setTimestamp()
        .setThumbnail(client.user.avatarURL())

        const banEmbed2 = new EmbedBuilder()
        .setColor(client.config.embedModHard)
        .setAuthor({ name: `${client.user.username} Moderation Tool`})
        .setTitle(`> ${client.config.modEmojiHard}  User was **\`BANNED\`** from "${guild.name}"  ${client.config.arrowEmoji}`)
        .addFields({ name: `Moderator:`, value: `${interaction.user.tag}`, inline: true})
        .addFields({ name: `User:`, value: `${target}`, inline: true})
        .addFields({ name: 'Reason', value: `> ${reason}`, inline: true})
        .setFooter({ text: `Banned from ${guild.name} ${client.config.devBy}`})
        .setTimestamp()
        .setThumbnail(client.user.avatarURL())

        const kickEmbed2 = new EmbedBuilder()
        .setColor(client.config.embedModHard)
        .setAuthor({ name: `${client.user.username} Moderation Tool`})
        .setTitle(`> ${client.config.modEmojiHard}  User was **\`KICKED\`** from "${guild.name}"  ${client.config.arrowEmoji}`)
        .addFields({ name: `Moderator:`, value: `${interaction.user.tag}`, inline: true})
        .addFields({ name: `User:`, value: `${target}`, inline: true})
        .addFields({ name: 'Reason', value: `> ${reason}`, inline: true})
        .setFooter({ text: `Kicked from ${guild.name} ${client.config.devBy}`})
        .setTimestamp()
        .setThumbnail(client.user.avatarURL())
        
        const timeoutEmbed2 = new EmbedBuilder()
        .setColor(client.config.embedModHard)
        .setAuthor({ name: `${client.user.username} Moderation Tool`})
        .setTitle(`> ${client.config.modEmojiHard}  User was **\`TIMED-OUT\`** from "${guild.name}"  ${client.config.arrowEmoji}`)
        .addFields({ name: `Moderator:`, value: `${interaction.user.tag}`, inline: true})
        .addFields({ name: `User:`, value: `${target}`, inline: true})
        .addFields({ name: 'Length', value: `> ${length} minute(s)`, inline: true})
        .addFields({ name: 'Reason', value: `> ${reason}`, inline: true})
        .setFooter({ text: `Timed-out in ${guild.name} ${client.config.devBy}`})
        .setTimestamp()
        .setThumbnail(client.user.avatarURL())

        const msg = await interaction.reply({ embeds: [mod_panel], components: [row_1] })

        collector = msg.createMessageComponentCollector()
        collector.on('collect', async i => {
            if(i.customId == 'kick') {
                if (i.user.id !== interaction.user.id) {
                    return await i.reply({ content: `Only ${interaction.user.tag} can interact with the buttons!`, ephemeral: true})
                }
                target.send({ embeds: [kickEmbed] }).catch((err) => { return client.logs.error('[MOD_PANEL_KICK] Failed to DM user.') });
                let kick = await guild.members.kick(target).catch((err) => {
                    client.logs.error("Error with Kick command: " + err) 
                })
                await interaction.channel.send({ embeds: [kickEmbed2] });
                if(!kick) {
                    await interaction.reply({ embeds: [failEmbed], ephemeral: true })
                }
            }
            if(i.customId == 'timeout') {
                if (i.user.id !== interaction.user.id) {
                    return await i.reply({ content: `Only ${interaction.user.tag} can interact with the buttons!`, ephemeral: true})
                }
                target.send({ embeds: [timeoutEmbed] }).catch((err) => { return client.logs.error('[MOD_PANEL_TIMEOUT] Failed to DM user.') });
                let timeout = await member.timeout(length * 60000).catch((err) => {
                    client.logs.error("Error with timeout command: " + err)
                })
                await interaction.channel.send({ embeds: [timeoutEmbed2] });
                if(!timeout) {
                    await interaction.reply({ embeds: [failEmbed], ephemeral: true })
                }
            }
            if(i.customId == 'delete') {
                if (i.user.id !== interaction.user.id) {
                    return await i.reply({ content: `Only ${interaction.user.tag} can interact with the buttons!`, ephemeral: true})
                }
                interaction.deleteReply();
            }
            if(i.customId == 'ban') {
                if (i.user.id !== interaction.user.id) {
                    return await i.reply({ content: `Only ${interaction.user.tag} can interact with the buttons!`, ephemeral: true})
                }
                target.send({ embeds: [banEmbed] }).catch((err) => { return client.logs.error('[MOD_PANEL_BAN] Failed to DM user.') });
                await interaction.channel.send({ embeds: [banEmbed2] });
                let ban = await guild.members.ban(target, { reason: `${reason}`}).catch((err) => { 
                    client.logs.error("Error with Ban command: " + err) 
                })
                if(!ban) {
                    await interaction.reply({ embeds: [failEmbed], ephemeral: true })
                }
            }
        })
    }
}