const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, PermissionFlagsBits, MessageFlags } = require('discord.js');
const linkSchema = require('../../schemas/antiLinkSystem');

module.exports = {
    usableInDms: false,
    category: "Moderation",
    permissions: [PermissionFlagsBits.ManageGuild],
    data: new SlashCommandBuilder()
    .setName('anti-link')
    .setDescription('Enables/Disables the anti-link moderation system.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(command => command.setName('setup').setDescription('Sets up the anti link system.').addStringOption(option => option.setName('permissions').setRequired(true).setDescription('Choose what permissions can bypass the anti-link system.')
        .addChoices(
            { name: 'Manage Channels', value: 'ManageChannels' },
            { name: 'Manage Server', value: 'ManageGuild' },
            { name: 'Embed Links', value: 'EmbedLinks' },
            { name: 'Attach Files', value: 'AttachFiles' },
            { name: 'Manage Messages', value: 'ManageMessages' },
            { name: 'Administrator', value: 'Administrator' }
        )))
    .addSubcommand(command => command.setName('disable').setDescription('Disables the anti-link moderation system.'))
    .addSubcommand(command => command.setName('check').setDescription('Provides statistics about the anti-link moderation system.'))
    .addSubcommand(command => command.setName('edit').setDescription('Edits the currently enabled anti-link moderation system.').addStringOption(option => option.setName('permissions').setRequired(true).setDescription('Choose what permissions can bypass the anti-link system.')
        .addChoices(
            { name: 'Manage Channels', value: 'ManageChannels' },
            { name: 'Manage Server', value: 'ManageGuild' },
            { name: 'Embed Links', value: 'EmbedLinks' },
            { name: 'Attach Files', value: 'AttachFiles' },
            { name: 'Manage Messages', value: 'ManageMessages' },
            { name: 'Administrator', value: 'Administrator' }
        )
    )),

    async execute(interaction, client) {
        
        const { options } = interaction;

        const sub = options.getSubcommand();

        switch (sub) {

            case 'setup':
            const permissions = options.getString('permissions');

            const Data = await linkSchema.findOne({ Guild: interaction.guild.id });

            if (Data) return await interaction.reply({ content: 'You already have a **anti-link system** set up. \n> Do \`\`/anti-link disable\`\` to undo.', flags: MessageFlags.Ephemeral});

            if (!Data) {
                await linkSchema.create({
                    Guild: interaction.guild.id,
                    Perms: permissions
                })
            }

            const embed = new EmbedBuilder()
            .setColor(client.config.embedModHard)
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Anti-link System ${client.config.devBy}`})
            .setTitle(`${client.config.modEmojiHard} ${client.user.username} anti-link system enabled ${client.config.arrowEmoji}`)
            .setDescription('> Anti-link system has been **successfully** set-up')
            .addFields({ name: 'Anti-link bypass permission', value: `> ${permissions}`})
            .setFooter({ text: 'Anti-Link system set up!'})
            .setTimestamp()

            await interaction.reply({ embeds: [embed] });
        }

        switch (sub) {

            case 'disable':

            const Data = await linkSchema.findOne({ Guild: interaction.guild.id });
            if (!Data) return await interaction.reply({ content: 'You **do not** have a **anti-link system** set up. \n> Do \`\`/anti-link setup\`\` to set one up.', flags: MessageFlags.Ephemeral});
            
            await linkSchema.deleteMany({ Guild: interaction.guild.id });

            const embedDisable = new EmbedBuilder()
            .setColor(client.config.embedModHard)
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Anti-link System ${client.config.devBy}`})
            .setTitle(`${client.config.modEmojiHard} ${client.user.username} anti-link system disabled ${client.config.arrowEmoji}`)
            .setDescription('> Anti-link system has been **removed**')
            .addFields({ name: 'Anti-link system was removed', value: `> ${client.user.username} will no longer delete links sent by Members.`})
            .setFooter({ text: 'Anti-Link system removed'})
            .setTimestamp()

            await interaction.reply({ embeds: [embedDisable] });
        }

        switch (sub) {

            case 'check':
            const Data = await linkSchema.findOne({ Guild: interaction.guild.id });

            if (!Data) return await interaction.reply({ content: 'Anti-link system has not yet been setup. Use \`\`/anti-link setup\`\` to get started.', flags: MessageFlags.Ephemeral});

            const permissions = Data.Perms;

            if (!permissions) return await interaction.reply({ content: 'Anti-link system has not yet been setup. Use \`\`/anti-link setup\`\` to get started.', flags: MessageFlags.Ephemeral});
            else await interaction.reply({ content: `**Anti-link** system is set up in this server. Bypass permissions:\n \`\`\`**${permissions}**\`\`\``, flags: MessageFlags.Ephemeral})
        }

        switch (sub) {

            case 'edit':
            const Data = await linkSchema.findOne({ Guild: interaction.guild.id });
            const permissions = options.getString('permissions');

            if (!Data) return await interaction.reply({ content: 'Anti-link system has not yet been setup. Use \`\`/anti-link setup\`\` to get started.', flags: MessageFlags.Ephemeral});
            else {
                await linkSchema.deleteMany();

                await linkSchema.create({
                    Guild: interaction.guild.id,
                    Perms: permissions
                })

                const embedEdit = new EmbedBuilder()
                .setColor(client.config.embedModHard)
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Anti-link System ${client.config.devBy}`})
                .setTitle(`${client.config.modEmojiHard} ${client.user.username} anti-link system edited ${client.config.arrowEmoji}`)
                .setDescription('> Anti-link system has been **successfully** modified')
                .addFields({ name: 'New anti-link bypass permission', value: `> \`\`\`${permissions}\`\`\``})
                .setFooter({ text: 'Anti-Link system edited'})
                .setTimestamp()

                await interaction.reply({ embeds: [embedEdit] })
            }
        }
    }
}