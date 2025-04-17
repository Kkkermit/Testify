const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');
const logSchema = require('../../schemas/auditLoggingSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('Set up and manage server logging system')
        .addSubcommand(subcommand => subcommand.setName('setup').setDescription('Set up the logging system').addChannelOption(option => option.setName('channel').setDescription('The channel to send logs to').setRequired(true)))
        .addSubcommand(subcommand => subcommand.setName('configure').setDescription('Configure which logs you want to receive'))
        .addSubcommand(subcommand => subcommand.setName('disable').setDescription('Disable the logging system'))
        .addSubcommand(subcommand => subcommand.setName('status').setDescription('Check the status of your logging system')),
        usableInDms: false,
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({
                content: `${client.config.noPerms}`,
                flags: MessageFlags.Ephemeral
            });
        }

        switch (subcommand) {
            case 'setup':
                await handleSetup(interaction, client);
                break;
            case 'configure':
                await handleConfigure(interaction, client);
                break;
            case 'disable':
                await handleDisable(interaction, client);
                break;
            case 'status':
                await handleStatus(interaction, client);
                break;
        }
    }
};

async function handleSetup(interaction, client) {
    const channel = interaction.options.getChannel('channel');

    let data = await logSchema.findOne({ Guild: interaction.guild.id });
    
    if (data) {
        data.Channel = channel.id;
        data.EnabledLogs = ["all"];
        await data.save();
    } else {
        data = new logSchema({
            Guild: interaction.guild.id,
            Channel: channel.id,
            EnabledLogs: ["all"]
        });
        await data.save();
    }
    
    const embed = new EmbedBuilder()
        .setColor(client.config.embedModHard)
        .setAuthor({ name: 'Logging System', iconURL: client.user.displayAvatarURL() })
        .setTitle(`${client.user.username} Logging System ${client.config.arrowEmoji}`)
        .setDescription(`> Logging system has been successfully set up!`)
        .addFields(
            { name: 'Log Channel', value: `> <#${channel.id}>` },
            { name: 'Status', value: `> All logs are enabled by default` },
            { name: 'Configure', value: `> Use \`/logs configure\` to choose which logs to receive` }
        )
        .setFooter({ text: `Setup by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function handleConfigure(interaction, client) {
    const data = await logSchema.findOne({ Guild: interaction.guild.id });
    
    if (!data) {
        return interaction.reply({
            content: `Logging system is not set up yet. Use \`/logs setup\` first.`,
            flags: MessageFlags.Ephemeral
        });
    }

    const select = new StringSelectMenuBuilder()
        .setCustomId('log_selection')
        .setPlaceholder('Select which logs to enable')
        .setMinValues(1)
        .setMaxValues(9) 
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('All Logs')
                .setDescription('Enable all logs')
                .setValue('all')
                .setDefault(data.EnabledLogs.includes('all')),
            new StringSelectMenuOptionBuilder()
                .setLabel('Message Events')
                .setDescription('Message deletions, edits, pins')
                .setValue('messageEvents')
                .setDefault(data.EnabledLogs.includes('messageEvents')),
            new StringSelectMenuOptionBuilder()
                .setLabel('Member Events')
                .setDescription('Joins, leaves, nickname changes, role changes')
                .setValue('memberEvents')
                .setDefault(data.EnabledLogs.includes('memberEvents')),
            new StringSelectMenuOptionBuilder()
                .setLabel('Channel Events')
                .setDescription('Channel creates, deletes, permission changes')
                .setValue('channelEvents')
                .setDefault(data.EnabledLogs.includes('channelEvents')),
            new StringSelectMenuOptionBuilder()
                .setLabel('Role Events')
                .setDescription('Role creates, deletes, permission updates')
                .setValue('roleEvents')
                .setDefault(data.EnabledLogs.includes('roleEvents')),
            new StringSelectMenuOptionBuilder()
                .setLabel('Moderation Events')
                .setDescription('Bans, unbans, timeouts, kicks')
                .setValue('moderationEvents')
                .setDefault(data.EnabledLogs.includes('moderationEvents')),
            new StringSelectMenuOptionBuilder()
                .setLabel('Boost Events')
                .setDescription('Server boosts, level changes, member boosts')
                .setValue('boostEvents')
                .setDefault(data.EnabledLogs.includes('boostEvents')),
            new StringSelectMenuOptionBuilder()
                .setLabel('Server Events')
                .setDescription('Vanity URL, banner changes, AFK channel')
                .setValue('serverEvents')
                .setDefault(data.EnabledLogs.includes('serverEvents')),
            new StringSelectMenuOptionBuilder()
                .setLabel('Voice Channel Events')
                .setDescription('Join, leave, switch, and mute/deaf actions')
                .setValue('voiceEvents')
                .setDefault(data.EnabledLogs.includes('voiceEvents'))
        );
    
    const row = new ActionRowBuilder().addComponents(select);
    
    const embed = new EmbedBuilder()
        .setColor(client.config.embedModHard)
        .setAuthor({ name: 'Logging System', iconURL: client.user.displayAvatarURL() })
        .setTitle(`${client.user.username} Configure Logs ${client.config.arrowEmoji}`)
        .setDescription(`> Select which logs you want to receive in <#${data.Channel}>`)
        .addFields(
            { name: 'Multiple Selection', value: '> You can select multiple log types by holding Ctrl/Cmd while clicking' },
            { name: 'Current Settings', value: `> ${data.EnabledLogs.includes('all') ? 'All logs are enabled' : `Enabled logs: ${data.EnabledLogs.join(', ')}`}` }
        )
        .setFooter({ text: `Configured by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();
    
    const response = await interaction.reply({ 
        embeds: [embed], 
        components: [row],
        fetchReply: true
    });
    
    const collector = response.createMessageComponentCollector({ 
        time: 60000 
    });
    
    collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
            return i.reply({ 
                content: 'Only the command user can interact with this menu.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        const selectedLogs = i.values;

        if (selectedLogs.includes('all')) {
            data.EnabledLogs = ['all'];
        } else {
            data.EnabledLogs = selectedLogs;
        }
        
        await data.save();
        
        const successEmbed = new EmbedBuilder()
            .setColor(client.config.embedModHard)
            .setTitle(`${client.user.username} Logging System ${client.config.arrowEmoji}`)
            .setDescription(`> Log settings have been updated!`)
            .addFields(
                { name: 'Enabled Logs', value: `> ${data.EnabledLogs.join('\n> ')}` }
            )
            .setFooter({ text: `Updated by ${i.user.tag}`, iconURL: i.user.displayAvatarURL() })
            .setTimestamp();
        
        await i.update({ 
            embeds: [successEmbed], 
            components: [] 
        });
    });
    
    collector.on('end', async (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
            const timeoutEmbed = new EmbedBuilder()
                .setColor('Red')
                .setDescription('Selection timed out. No changes were made.');
            
            await interaction.editReply({ 
                embeds: [timeoutEmbed], 
                components: [] 
            });
        }
    });
}

async function handleDisable(interaction, client) {
    const data = await logSchema.findOne({ Guild: interaction.guild.id });
    
    if (!data) {
        return interaction.reply({
            content: `Logging system is not set up yet.`,
            flags: MessageFlags.Ephemeral
        });
    }

    await logSchema.findOneAndDelete({ Guild: interaction.guild.id });
    
    const embed = new EmbedBuilder()
        .setColor(client.config.embedModHard)
        .setAuthor({ name: 'Logging System', iconURL: client.user.displayAvatarURL() })
        .setTitle(`${client.user.username} Logging System ${client.config.arrowEmoji}`)
        .setDescription(`> Logging system has been disabled`)
        .setFooter({ text: `Disabled by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function handleStatus(interaction, client) {
    const data = await logSchema.findOne({ Guild: interaction.guild.id });
    
    if (!data) {
        return interaction.reply({
            content: `Logging system is not set up yet. Use \`/logs setup\` to set it up.`,
            flags: MessageFlags.Ephemeral
        });
    }
    
    const logChannel = client.channels.cache.get(data.Channel);
    const channelStatus = logChannel ? `<#${data.Channel}>` : `Channel not found (ID: ${data.Channel})`;
    
    const embed = new EmbedBuilder()
        .setColor(client.config.embedModHard)
        .setAuthor({ name: 'Logging System', iconURL: client.user.displayAvatarURL() })
        .setTitle(`${client.user.username} Logging Status ${client.config.arrowEmoji}`)
        .setDescription(`> Here's the current status of your logging system`)
        .addFields(
            { name: 'Log Channel', value: `> ${channelStatus}` },
            { name: 'Enabled Logs', value: `> ${data.EnabledLogs.includes('all') ? 'All logs are enabled' : data.EnabledLogs.join('\n> ')}` }
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}
