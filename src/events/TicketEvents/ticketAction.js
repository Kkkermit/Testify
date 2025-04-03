const { Events, EmbedBuilder, PermissionFlagsBits, UserSelectMenuBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');
const { createTranscript } = require('discord-html-transcripts');
const TicketSetup = require('../../schemas/ticketSetupSystem');
const TicketSchema = require('../../schemas/ticketSystem');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {

        const { guild, member, customId, channel } = interaction;
        const { ManageChannels, SendMessages } = PermissionFlagsBits;

        if(!interaction.isButton()) return;
        if(!['ticket-close', 'ticket-lock', 'ticket-unlock', 'ticket-manage', 'ticket-claim'].includes(customId)) return;

        const docs = await TicketSetup.findOne({GuildID: guild.id});
        if (!docs) return;

        const errorEmbed = new EmbedBuilder()
            .setColor('Red')
            .setDescription(`${client.config.ticketError} \nIf you believe this to be an error in the bot, please use \`\`/bug-report\`\` and report the problem to the developers.`)
            .setTitle('Somethings gone wrong...')
            .setTimestamp()

        if (!guild.members.me.permissions.has((r) => r.id === docs.Handlers)) return interaction.reply({embeds: [errorEmbed], flags: MessageFlags.Ephemeral}).catch(error => { return });
        
        const executeEmbed = new EmbedBuilder()
        .setColor('Aqua');

        const nopermissionsEmbed = new EmbedBuilder()
        .setColor('Red')
        .setDescription(client.config.ticketNoPermissions)

        const alreadyEmbed = new EmbedBuilder()
        .setColor('Orange');

        TicketSchema.findOne({GuildID: guild.id, ChannelID: channel.id}, async (err, data) => {
            if (err) throw err;
            if (!data) return;

            await guild.members.cache.get(data.MemberID);
            await guild.members.cache.get(data.OwnerID);

            switch (customId) {
                case 'ticket-close':

                    if ((!member.permissions.has(ManageChannels)) & (!member.roles.cache.has(docs.Handlers))) return interaction.reply({embeds: [nopermissionsEmbed], flags: MessageFlags.Ephemeral}).catch(error => { return });
                    const transcript = await createTranscript(channel, {
                        limit: -1,
                        returnType: 'attachment',
                        saveImages: true,
                        poweredBy: false,
                        filename: client.config.ticketName + data.TicketID + '.html',
                    }).catch(error => { return });

                    let claimed = undefined;
                    if (data.Claimed === true) {
                        claimed = '\✅'
                    }
                    if (data.Claimed === false) {
                        claimed = '\❌'
                    }
                    if (data.ClaimedBy === undefined) {
                        data.ClaimedBy = '\❌'
                    }else {
                        data.ClaimedBy = '<@' + data.ClaimedBy + '>'
                    };

                    const transcriptTimestamp = Math.round(Date.now() / 1000)

                    const transcriptEmbed = new EmbedBuilder()
                    .setDescription(`${client.config.ticketTranscriptMember} <@${data.OwnerID}>\n${client.config.ticketTranscriptTicket} ${data.TicketID}\n${client.config.ticketTranscriptClaimed} ${claimed}\n${client.config.ticketTranscriptModerator} ${data.ClaimedBy}\n${client.config.ticketTranscriptTime} <t:${transcriptTimestamp}:R> (<t:${transcriptTimestamp}:F>)`)

                    const closingTicket = new EmbedBuilder()
                    .setTitle(client.config.ticketCloseTitle)
                    .setDescription(client.config.ticketCloseDescription)
                    .setColor('Red');

                    await guild.channels.cache.get(docs.Transcripts).send({ embeds: [transcriptEmbed], files: [transcript] }).catch(error => { return });

                    interaction.deferUpdate().catch(error => { return });

                    channel.send({embeds: [closingTicket]}).catch(error => { return });

                    await TicketSchema.findOneAndDelete({ GuildID: guild.id, ChannelID: channel.id });

                    setTimeout(() => {channel.delete().catch(error => { return })}, 5000);

                break;
                case 'ticket-lock':

                    if ((!member.permissions.has(ManageChannels)) & (!member.roles.cache.has(docs.Handlers))) return interaction.reply({ embeds: [nopermissionsEmbed], flags: MessageFlags.Ephemeral }).catch(error => { return });

                    alreadyEmbed.setDescription(client.config.ticketAlreadyLocked);
                    if (data.Locked == true) 
                        return interaction.reply({ embeds: [alreadyEmbed], flags: MessageFlags.Ephemeral }).catch(error => { return });

                    await TicketSchema.updateOne({ ChannelID: channel.id }, { Locked: true });

                    executeEmbed.setDescription(client.config.ticketSuccessLocked); 
                    data.MembersID.forEach((m) => { channel.permissionOverwrites.edit(m, { SendMessages: false  }).catch(error => { return }) });
                    channel.permissionOverwrites.edit(data.OwnerID, { SendMessages: false }).catch(error => { return });

                    interaction.deferUpdate().catch(error => {return});

                    return interaction.channel.send({ embeds: [executeEmbed] }).catch(error => { return });

                case 'ticket-unlock':

                    if ((!member.permissions.has(ManageChannels)) & (!member.roles.cache.has(docs.Handlers))) return interaction.reply({ embeds: [nopermissionsEmbed], flags: MessageFlags.Ephemeral }).catch(error => { return });

                    alreadyEmbed.setDescription(client.config.ticketAlreadyUnlocked);
                    if (data.Locked == false) 
                        return interaction.reply({ embeds: [alreadyEmbed], flags: MessageFlags.Ephemeral }).catch(error => { return });

                    await TicketSchema.updateOne({ ChannelID: channel.id }, { Locked: false });

                    executeEmbed.setDescription(client.config.ticketSuccessUnlocked);
                    data.MembersID.forEach((m) => { channel.permissionOverwrites.edit(m, { SendMessages: true }).catch(error => { return }) });
                    channel.permissionOverwrites.edit(data.OwnerID, { SendMessages: true }).catch(error => { return });

                    interaction.deferUpdate().catch(error => { return });

                    return interaction.channel.send({ embeds: [executeEmbed] }).catch(error => { return });

                case 'ticket-manage':

                    if ((!member.permissions.has(ManageChannels)) & (!member.roles.cache.has(docs.Handlers))) return interaction.reply({ embeds: [nopermissionsEmbed], flags: MessageFlags.Ephemeral }).catch(error => { return });

                    const menu = new UserSelectMenuBuilder()
                    .setCustomId('ticket-manage-menu')
                    .setPlaceholder(client.config.ticketManageMenuEmoji + client.config.ticketManageMenuTitle)
                    .setMinValues(1)
                    .setMaxValues(1)
                    
                    const row = new ActionRowBuilder()
                    .addComponents(menu);

                    return interaction.reply({ components: [row], flags: MessageFlags.Ephemeral }).catch(error => { return });
                    
                case 'ticket-claim':

                    if ((!member.permissions.has(ManageChannels)) & (!member.roles.cache.has(docs.Handlers))) return interaction.reply({ embeds: [nopermissionsEmbed], flags: MessageFlags.Ephemeral }).catch(error => { return });

                    alreadyEmbed.setDescription(client.config.ticketAlreadyClaim + ' <@' + data.ClaimedBy + '>.');
                    if (data.Claimed == true) 
                        return interaction.reply({ embeds: [alreadyEmbed], flags: MessageFlags.Ephemeral }).catch(error => { return });

                    await TicketSchema.updateOne({ ChannelID: channel.id }, { Claimed: true, ClaimedBy: member.id });

                    let lastinfos = channel;

                    await channel.edit({ name: client.config.ticketClaimEmoji + '・' + lastinfos.name, topic: lastinfos.topic + client.config.ticketDescriptionClaim + '<@' + member.id + '>.' }).catch(error => { return });

                    executeEmbed.setDescription(client.config.ticketSuccessClaim + ' <@' + member.id + '>.');

                    interaction.deferUpdate().catch(error => { return });
                    interaction.channel.send({ embeds: [executeEmbed] }).catch(error => { return });

                break;
            }
        })
    }
}
