const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js");
const Schema = require('../../schemas/auditLoggingSystem');

module.exports = {
    data: new SlashCommandBuilder()
    .setName("auditlog-setup")
    .setDescription("Setup the audit log system in your server")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {

        const guild = interaction.guild;
    
        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
    
        const channelOptions = textChannels.map(channel => ({
            label: channel.name.length > 100 ? channel.name.substring(0, 97) + "..." : channel.name,
            description: `ID: ${channel.id}`,
            value: channel.id,
        }));
    
        let config = await Schema.findOne({ Guild: guild.id });
        if (!config) {
            config = await Schema.create({
                Guild: guild.id,
                LogLevel: []
            });
        }
    
        const currentSettings = config.LogLevel || [];
        let currentSettingsList = currentSettings.length > 0
            ? currentSettings.join('\n')
            : 'None selected.';
    
        const selectOptions = [
            { label: 'Channel Create', description: 'A channel was created', value: 'channelCreate' },
            { label: 'Channel Update', description: 'A channel was updated', value: 'channelUpdate' },
            { label: 'Channel Delete', description: 'A channel was deleted', value: 'channelDelete' },
            { label: 'Message Create', description: 'A message was created', value: 'messageCreate' },
            { label: 'Message Delete', description: 'A message was deleted', value: 'messageDelete' },
            { label: 'Message Update', description: 'A message was updated', value: 'messageUpdate' },
            { label: 'Voice States', description: 'A user joined a voice channel!', value: 'voiceChannelActivity'},
            { label: 'Guild Member Add', description: 'A new member joined a guild', value: 'guildMemberAdd' },
            { label: 'Guild Member Remove', description: 'A member was removed from a guild', value: 'guildMemberRemove' },
            { label: 'Guild Ban Add', description: 'A member was banned from a guild', value: 'guildBanAdd' },
            { label: 'Guild Ban Remove', description: 'A ban was lifted from a member', value: 'guildBanRemove' },
            { label: 'Guild Update', description: 'A guild (server) was updated', value: 'guildUpdate' },
            { label: 'Role Create', description: 'A role was created', value: 'roleCreate' },
            { label: 'Role Update', description: 'A role was updated', value: 'roleUpdate' },
            { label: 'Role Delete', description: 'A role was deleted', value: 'roleDelete' },
            { label: 'Emoji Create', description: 'An emoji was created', value: 'emojiCreate' },
            { label: 'Emoji Update', description: 'An emoji was updated', value: 'emojiUpdate' },
            { label: 'Emoji Delete', description: 'An emoji was deleted', value: 'emojiDelete' },
            { label: 'User Updates', description: 'A user has been updated!', value: 'userUpdates' },
            { label: 'Invite Create', description: 'An invite was created', value: 'inviteCreate' },
            { label: 'Invite Delete', description: 'An invite was deleted', value: 'inviteDelete' },
        ].map(option => ({
            ...option,
            default: currentSettings.includes(option.value),
        }));
    
        const loggingLevelsSelectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('selectLoggingLevel')
                    .setPlaceholder('Choose logging levels...')
                    .setMinValues(1)
                    .setMaxValues(selectOptions.length)
                    .addOptions(selectOptions)
            );
    
        const channelSelectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('selectAuditLogChannel')
                    .setPlaceholder('Select a channel for Audit Logs...')
                    .addOptions(channelOptions)
            ); 

            const setupEmbed = new EmbedBuilder()
            .setAuthor({ name: `Audit Log Setup ${client.config.devBy}`, iconURL: guild.iconURL() })
            .setColor(client.config.embedAuditLogs)
            .setTitle(`${client.config.auditLogEmoji} Audit Log Setup ${client.config.arrowEmoji}`)
            .setDescription(`Select the events you want to log and the channel to send them to from the dropdown menus below.\n\n**Current Logging Levels:**\n${currentSettingsList}`)
            .setThumbnail(client.user.avatarURL())
            .setFooter({ text: `${client.user.username}'s logging system` })
            .setTimestamp();
    
        await interaction.reply({ embeds: [setupEmbed], components: [loggingLevelsSelectMenu, channelSelectMenu], ephemeral: true });
    }
}