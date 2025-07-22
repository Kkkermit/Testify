const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const treasureConfigSchema = require('../../schemas/treasureConfigSchema');

module.exports = {
    usableInDms: false,
    category: "Economy",
    data: new SlashCommandBuilder()
        .setName('treasureconfig')
        .setDescription('Configure the random money finding events (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set up the random treasure event system')
                .addIntegerOption(option =>
                    option.setName('min_messages')
                        .setDescription('Minimum messages before an event can trigger')
                        .setMinValue(5)
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('max_messages')
                        .setDescription('Maximum messages before an event triggers')
                        .setMinValue(10)
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('min_amount')
                        .setDescription('Minimum amount of money that can be found ($)')
                        .setMinValue(1)
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('max_amount')
                        .setDescription('Maximum amount of money that can be found ($)')
                        .setMinValue(5)
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('cooldown')
                        .setDescription('Cooldown between events (in minutes)')
                        .setMinValue(1)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View the current random treasure configuration'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit treasure event settings')
                .addIntegerOption(option =>
                    option.setName('min_messages')
                        .setDescription('Minimum messages before an event can trigger')
                        .setMinValue(5))
                .addIntegerOption(option =>
                    option.setName('max_messages')
                        .setDescription('Maximum messages before an event triggers')
                        .setMinValue(10))
                .addIntegerOption(option =>
                    option.setName('min_amount')
                        .setDescription('Minimum amount of money that can be found ($)')
                        .setMinValue(1))
                .addIntegerOption(option =>
                    option.setName('max_amount')
                        .setDescription('Maximum amount of money that can be found ($)')
                        .setMinValue(5))
                .addIntegerOption(option =>
                    option.setName('cooldown')
                        .setDescription('Cooldown between events (in minutes)')
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Enable or disable the treasure event system')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Whether the treasure event system is enabled')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Completely disable and delete the treasure event configuration')),

    async execute(interaction, client) {
        const { guild, user, options } = interaction;
        const subcommand = options.getSubcommand();

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({
                content: 'You need the "Manage Server" permission to use this command.',
                ephemeral: true
            });
        }

        if (subcommand === 'setup') {
            const existingConfig = await treasureConfigSchema.findOne({ Guild: guild.id });
            
            if (existingConfig) {
                return interaction.reply({
                    content: 'Treasure event system is already set up. Use `/treasureconfig edit` to modify settings.',
                    ephemeral: true
                });
            }
            
            const minMessages = options.getInteger('min_messages');
            const maxMessages = options.getInteger('max_messages');
            const minAmount = options.getInteger('min_amount');
            const maxAmount = options.getInteger('max_amount');
            const cooldownMinutes = options.getInteger('cooldown');
            
            if (minMessages >= maxMessages) {
                return interaction.reply({
                    content: 'Minimum messages must be less than maximum messages.',
                    ephemeral: true
                });
            }
            
            if (minAmount >= maxAmount) {
                return interaction.reply({
                    content: 'Minimum amount must be less than maximum amount.',
                    ephemeral: true
                });
            }
            
            const newConfig = new treasureConfigSchema({
                Guild: guild.id,
                Enabled: true,
                MinMessages: minMessages,
                MaxMessages: maxMessages,
                MinAmount: minAmount,
                MaxAmount: maxAmount,
                Cooldown: cooldownMinutes * 60000,
                CreatedBy: user.id,
                LastModifiedBy: user.id
            });
            
            await newConfig.save();
            
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('💰 Treasure Event System Setup')
                .setDescription('Random money finding events have been configured successfully!')
                .addFields(
                    { name: '📊 Message Range', value: `${minMessages} - ${maxMessages} messages`, inline: true },
                    { name: '💵 Money Range', value: `$${minAmount} - $${maxAmount}`, inline: true },
                    { name: '⏱️ Cooldown', value: `${cooldownMinutes} minutes`, inline: true }
                )
                .setFooter({ text: `Setup by ${user.tag}`, iconURL: user.displayAvatarURL() })
                .setTimestamp();
                
            return interaction.reply({ embeds: [embed] });
        } 
        else if (subcommand === 'view') {
            const config = await treasureConfigSchema.findOne({ Guild: guild.id });
            
            if (!config) {
                return interaction.reply({
                    content: 'Treasure event system is not set up yet. Use `/treasureconfig setup` to configure it.',
                    ephemeral: true
                });
            }
            
            const embed = new EmbedBuilder()
                .setColor(config.Enabled ? '#00FF00' : '#FF0000')
                .setTitle('💰 Treasure Event Configuration')
                .setDescription(`Status: **${config.Enabled ? 'Enabled' : 'Disabled'}**`)
                .addFields(
                    { name: '📊 Message Range', value: `${config.MinMessages} - ${config.MaxMessages} messages`, inline: true },
                    { name: '💵 Money Range', value: `$${config.MinAmount} - $${config.MaxAmount}`, inline: true },
                    { name: '⏱️ Cooldown', value: `${config.Cooldown / 60000} minutes`, inline: true },
                    { name: '🛠️ Setup Information', value: `Created by: <@${config.CreatedBy}>\nCreated at: <t:${Math.floor(config.CreatedAt.getTime() / 1000)}:F>\nLast modified by: <@${config.LastModifiedBy}>\nLast modified at: <t:${Math.floor(config.LastModifiedAt.getTime() / 1000)}:F>`, inline: false }
                )
                .setFooter({ text: `Server ID: ${guild.id}`, iconURL: guild.iconURL() })
                .setTimestamp();
                
            return interaction.reply({ embeds: [embed] });
        } 
        else if (subcommand === 'edit') {
            const config = await treasureConfigSchema.findOne({ Guild: guild.id });
            
            if (!config) {
                return interaction.reply({
                    content: 'Treasure event system is not set up yet. Use `/treasureconfig setup` to configure it.',
                    ephemeral: true
                });
            }

            const minMessages = options.getInteger('min_messages');
            const maxMessages = options.getInteger('max_messages');
            const minAmount = options.getInteger('min_amount');
            const maxAmount = options.getInteger('max_amount');
            const cooldownMinutes = options.getInteger('cooldown');
            
            const changes = [];
            let valueChanged = false;
            
            if (minMessages !== null) {
                if (maxMessages !== null && minMessages >= maxMessages) {
                    return interaction.reply({
                        content: 'Minimum messages must be less than maximum messages.',
                        ephemeral: true
                    });
                } else if (minMessages >= config.MaxMessages) {
                    return interaction.reply({
                        content: `Minimum messages (${minMessages}) must be less than maximum messages (${config.MaxMessages}).`,
                        ephemeral: true
                    });
                }
                
                changes.push(`Minimum messages: ${config.MinMessages} → ${minMessages}`);
                config.MinMessages = minMessages;
                valueChanged = true;
            }
            
            if (maxMessages !== null) {
                if (minMessages !== null && minMessages >= maxMessages) {
                    return interaction.reply({
                        content: 'Minimum messages must be less than maximum messages.',
                        ephemeral: true
                    });
                } else if (config.MinMessages >= maxMessages) {
                    return interaction.reply({
                        content: `Minimum messages (${config.MinMessages}) must be less than maximum messages (${maxMessages}).`,
                        ephemeral: true
                    });
                }
                
                changes.push(`Maximum messages: ${config.MaxMessages} → ${maxMessages}`);
                config.MaxMessages = maxMessages;
                valueChanged = true;
            }
            
            if (minAmount !== null) {
                if (maxAmount !== null && minAmount >= maxAmount) {
                    return interaction.reply({
                        content: 'Minimum amount must be less than maximum amount.',
                        ephemeral: true
                    });
                } else if (minAmount >= config.MaxAmount) {
                    return interaction.reply({
                        content: `Minimum amount ($${minAmount}) must be less than maximum amount ($${config.MaxAmount}).`,
                        ephemeral: true
                    });
                }
                
                changes.push(`Minimum amount: $${config.MinAmount} → $${minAmount}`);
                config.MinAmount = minAmount;
                valueChanged = true;
            }
            
            if (maxAmount !== null) {
                if (minAmount !== null && minAmount >= maxAmount) {
                    return interaction.reply({
                        content: 'Minimum amount must be less than maximum amount.',
                        ephemeral: true
                    });
                } else if (config.MinAmount >= maxAmount) {
                    return interaction.reply({
                        content: `Minimum amount ($${config.MinAmount}) must be less than maximum amount ($${maxAmount}).`,
                        ephemeral: true
                    });
                }
                
                changes.push(`Maximum amount: $${config.MaxAmount} → $${maxAmount}`);
                config.MaxAmount = maxAmount;
                valueChanged = true;
            }
            
            if (cooldownMinutes !== null) {
                changes.push(`Cooldown: ${config.Cooldown / 60000} minutes → ${cooldownMinutes} minutes`);
                config.Cooldown = cooldownMinutes * 60000;
                valueChanged = true;
            }
            
            if (!valueChanged) {
                return interaction.reply({
                    content: 'No changes were provided. Configuration remains unchanged.',
                    ephemeral: true
                });
            }
            
            config.LastModifiedBy = user.id;
            config.LastModifiedAt = new Date();
            
            await config.save();
            
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('💰 Treasure Event Configuration Updated')
                .setDescription('The following settings have been updated:')
                .addFields(
                    { name: '📝 Changes', value: changes.map(c => `• ${c}`).join('\n'), inline: false }
                )
                .setFooter({ text: `Modified by ${user.tag}`, iconURL: user.displayAvatarURL() })
                .setTimestamp();
                
            return interaction.reply({ embeds: [embed] });
        }
        else if (subcommand === 'toggle') {
            const config = await treasureConfigSchema.findOne({ Guild: guild.id });
            
            if (!config) {
                return interaction.reply({
                    content: 'Treasure event system is not set up yet. Use `/treasureconfig setup` to configure it.',
                    ephemeral: true
                });
            }
            
            const enabled = options.getBoolean('enabled');
            
            if (config.Enabled === enabled) {
                return interaction.reply({
                    content: `Treasure event system is already ${enabled ? 'enabled' : 'disabled'}.`,
                    ephemeral: true
                });
            }
            
            config.Enabled = enabled;
            config.LastModifiedBy = user.id;
            config.LastModifiedAt = new Date();
            
            await config.save();
            
            const embed = new EmbedBuilder()
                .setColor(enabled ? '#00FF00' : '#FF0000')
                .setTitle('💰 Treasure Event Configuration Updated')
                .setDescription(`Treasure event system has been **${enabled ? 'Enabled' : 'Disabled'}**.`)
                .setFooter({ text: `Modified by ${user.tag}`, iconURL: user.displayAvatarURL() })
                .setTimestamp();
                
            return interaction.reply({ embeds: [embed] });
        }
        else if (subcommand === 'disable') {
            const config = await treasureConfigSchema.findOne({ Guild: guild.id });
            
            if (!config) {
                return interaction.reply({
                    content: 'Treasure event system is not set up yet.',
                    ephemeral: true
                });
            }
            
            await treasureConfigSchema.deleteOne({ Guild: guild.id });
            
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('💰 Treasure Event System Disabled')
                .setDescription('The treasure event system has been completely disabled and configuration removed. Use `/treasureconfig setup` to set it up again if needed.')
                .setFooter({ text: `Disabled by ${user.tag}`, iconURL: user.displayAvatarURL() })
                .setTimestamp();
                
            return interaction.reply({ embeds: [embed] });
        }
    }
};
