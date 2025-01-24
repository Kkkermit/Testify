const { Events, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const TicketSchema = require('../../schemas/ticketSystem');
const TicketSetup = require('../../schemas/ticketSetupSystem');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {

        const { guild, member, customId, channel } = interaction;

        const { ViewChannel, SendMessages, ManageChannels, ReadMessageHistory } = PermissionFlagsBits;

        const ticketId = Math.floor(Math.random() * 9000) + 10000;

        if (!interaction.isButton()) return;

        const data = await TicketSetup.findOne({GuildID: guild.id});
        if (!data) return;
        if (!data.Button.includes(customId)) return;
        
        const alreadyticketEmbed = new EmbedBuilder()
        .setDescription(client.config.ticketAlreadyExist)
        .setColor('Red')

        const findTicket = await TicketSchema.findOne({ GuildID: guild.id, OwnerID: member.id });

        if (findTicket) 
            return interaction.reply({ embeds: [alreadyticketEmbed], ephemeral: true }).catch(error => { return });

        if (!guild.members.me.permissions.has(ManageChannels)) 
            return interaction.reply({ content: `${client.config.ticketMissingPerms}`, ephemeral: true }).catch(error => { return });
        try {
            await guild.channels.create({
                name: client.config.ticketName + ticketId,
                type: ChannelType.GuildText,
                parent: data.Category,
                permissionOverwrites: [
                    {
                        id: data.Everyone,
                        deny: [ViewChannel, SendMessages, ReadMessageHistory],
                    },
                    {
                        id: data.Handlers,
                        allow: [ViewChannel, SendMessages, ReadMessageHistory, ManageChannels],
                    },
                    {
                        id: member.id,
                        allow: [ViewChannel, SendMessages, ReadMessageHistory],
                    },
                ],
            }).catch(error => { return })
            .then(async (channel) => {
                await TicketSchema.create({
                    GuildID: guild.id,
                    OwnerID: member.id,
                    MemberID: member.id,
                    TicketID: ticketId,
                    ChannelID: channel.id,
                    Locked: false,
                    Claimed: false,
                });

                await channel.setTopic(client.config.ticketDescription + ' <@' + member.id + '>').catch(error => { return });

                const embed = new EmbedBuilder()
                .setTitle(client.config.ticketMessageTitle)
                .setDescription(client.config.ticketMessageDescription)

                const button = new ActionRowBuilder()
                    .setComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket-close')
                        .setLabel(client.config.ticketClose)
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji(client.config.ticketCloseEmoji),
                    new ButtonBuilder()
                        .setCustomId('ticket-lock')
                        .setLabel(client.config.ticketLock)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(client.config.ticketLockEmoji),
                    new ButtonBuilder()
                        .setCustomId('ticket-unlock')
                        .setLabel(client.config.ticketUnlock)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(client.config.ticketUnlockEmoji),
                    new ButtonBuilder()
                        .setCustomId('ticket-manage')
                        .setLabel(client.config.ticketManage)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(client.config.ticketManageEmoji),
                    new ButtonBuilder()
                        .setCustomId('ticket-claim')
                        .setLabel(client.config.ticketClaim)
                        .setStyle(ButtonStyle.Primary).
                        setEmoji(client.config.ticketClaimEmoji),
                );

                channel.send({ embeds: [embed], components: [button] }).catch(error => { return });

                const handlersmention = await channel.send({ content : '<@&' + data.Handlers + '>' });
                handlersmention.delete().catch(error => {return});

                const ticketmessage = new EmbedBuilder()
                .setDescription(client.config.ticketCreate + ' <#' + channel.id + '>')
                .setColor('Green');

                interaction.reply({ embeds: [ticketmessage], ephemeral: true }).catch(error => { return });
            })
        } catch (err) {
            return client.logs.error(`[TICKET_SYSTEM] Error while creating the ticket response in ${guild.name}`, err);
        }
    }
}