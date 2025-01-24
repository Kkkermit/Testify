const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const TicketSetup = require('../../schemas/ticketSetupSystem');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('A command to setup the ticket system.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(option => option.setName('channel').setDescription('Select the channel where the tickets should be created.').setRequired(true).addChannelTypes(ChannelType.GuildText))
    .addChannelOption(option => option.setName('category').setDescription('Select the parent where the tickets should be created.').setRequired(true).addChannelTypes(ChannelType.GuildCategory))
    .addChannelOption(option => option.setName('transcripts').setDescription('Select the channel where the transcripts should be sent.').setRequired(true).addChannelTypes(ChannelType.GuildText))
    .addRoleOption(option => option.setName('handlers').setDescription('Select the ticket handlers role.').setRequired(true))
    .addRoleOption(option => option.setName('everyone').setDescription('Select the everyone role.').setRequired(true))
    .addStringOption(option => option.setName('description').setDescription('Choose a description for the ticket embed.').setRequired(true))
    .addStringOption(option => option.setName('button').setDescription('Choose a name for the ticket embed.').setRequired(true))
    .addStringOption(option => option.setName('emoji').setDescription('Choose a style, so choose a emoji.').setRequired(true)),
    async execute(interaction, client) {

        const { guild, options } = interaction;

        try {
            const channel = options.getChannel('channel');
            const category = options.getChannel('category');
            const transcripts = options.getChannel('transcripts');
            const handlers = options.getRole('handlers');
            const everyone = options.getRole('everyone');
            const description = options.getString('description');
            const button = options.getString('button');
            const emoji = options.getString('emoji');

            await TicketSetup.findOneAndUpdate(
                { GuildID: guild.id },
                {
                    Channel: channel.id,
                    Category: category.id,
                    Transcripts: transcripts.id,
                    Handlers: handlers.id,
                    Everyone: everyone.id,
                    Description: description,
                    Button: button,
                    Emoji: emoji,
                },
                {
                new: true,
                upsert: true,
                }
            );
            const embed = new EmbedBuilder()
            .setDescription(description);

            const buttonshow = new ButtonBuilder()
                .setCustomId(button)
                .setLabel(button)
                .setEmoji(emoji)
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder()
                .addComponents(buttonshow);

            const ticketChannel = guild.channels.cache.get(channel.id);
            await ticketChannel.send({ embeds: [embed], components: [row] }).catch(error => { return });

            const sendSuccessEmbed = new EmbedBuilder()
            .setAuthor({ name: `Ticket system ${client.config.devBy}`})
            .setTitle(`${client.user.username} ticket system ${client.config.arrowEmoji}`)
            .setThumbnail(client.user.displayAvatarURL())
            .setTimestamp()
            .setColor('Green')
            .setDescription('The ticket panel was successfully created.')
            .addFields({ name: 'Ticket channel', value: `<#${channel.id}>`, inline: true })
            .addFields({ name: 'Category', value: `<#${category.id}>`, inline: true })
            .addFields({ name: 'Transcripts', value: `<#${transcripts.id}>`, inline: true })
            .addFields({ name: 'Handlers', value: `<@&${handlers.id}>`, inline: true })
            .addFields({ name: 'Everyone', value: `<@&${everyone.id}>`, inline: true })
            .addFields({ name: 'Description', value: `${description}`, inline: true })
            .addFields({ name: 'Button Text', value: `${button}`, inline: true })
            .addFields({ name: 'Button Emoji', value: `${emoji}`, inline: true })
            .setFooter({ text: `Created by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });


            return interaction.reply({ embeds: [sendSuccessEmbed] });
        } catch (err) {
            client.logs.error(`[TICKET_SYSTEM] Error creating ticket system for ${interaction.user.username} in ${guild.name}`, err);

            const errEmbed = new EmbedBuilder()
            .setColor('Red')
            .setDescription(`${client.config.ticketError} \nIf you believe this to be an error in the bot, please use \`\`/bug-report\`\` and report the problem to the developers.`)
            .setTitle('Somethings gone wrong...')
            .setTimestamp()

            return interaction.reply({ embeds: [errEmbed], ephemeral: true }).catch(error => { return });
        }
    },
};
