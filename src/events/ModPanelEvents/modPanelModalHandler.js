const { Events, EmbedBuilder, MessageFlags } = require('discord.js');
const SoftbanEntry = require('../../schemas/softbanSystem');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isModalSubmit() || !interaction.customId.startsWith('modpanel_modal_')) return;
        
        const parts = interaction.customId.split('_');
        
        if (parts.length < 4) {
            return await interaction.reply({
                content: 'Invalid moderation modal submission. Please try again.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        const prefix = parts[0];
        const modalType = parts[1]; 
        const panelId = parts[2];
        const action = parts[3];
        
        if (!client.modPanels || !client.modPanels.has(panelId)) {
            return await interaction.reply({
                content: 'This moderation panel has expired or is no longer valid. Please create a new one.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        const panelData = client.modPanels.get(panelId);
        
        const reason = interaction.fields.getTextInputValue('reason');
        
        let duration = 60;
        if (action === 'timeout') {
            const durationInput = interaction.fields.getTextInputValue('duration');
            duration = parseInt(durationInput);
            
            if (isNaN(duration) || duration <= 0) {
                return await interaction.reply({
                    content: 'Please provide a valid positive number for the duration.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            if (duration > 40320) {
                return await interaction.reply({
                    content: 'Discord limits timeouts to a maximum of 28 days (40320 minutes).',
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        let deleteMessageSeconds = 0;
        if (action === 'ban' || action === 'softban') {
            const deleteMessagesInput = interaction.fields.getTextInputValue('deleteMessages');
            const deleteMessageDays = parseInt(deleteMessagesInput);
            
            if (isNaN(deleteMessageDays) || deleteMessageDays < 0 || deleteMessageDays > 7) {
                return await interaction.reply({
                    content: 'Please provide a valid number between 0 and 7 for message deletion days.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            deleteMessageSeconds = deleteMessageDays * 86400;
        }

        let softbanDuration = 0; 
        let softbanDurationText = "0 seconds";
        let expiresAt = null;
        
        if (action === 'softban' && interaction.fields.getTextInputValue('duration')) {
            const durationInput = interaction.fields.getTextInputValue('duration');
            softbanDurationText = durationInput;

            const durationRegex = /^(\d+)\s+(second|seconds|minute|minutes|hour|hours|day|days|week|weeks|month|months)$/i;
            const match = durationInput.match(durationRegex);
            
            if (!match) {
                return await interaction.reply({
                    content: 'Please provide a valid duration format (e.g., "5 minutes", "1 day", "2 weeks").',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            const value = parseInt(match[1]);
            const unit = match[2].toLowerCase();
            
            if (isNaN(value) || value < 0) {
                return await interaction.reply({
                    content: 'Please provide a valid positive number for duration.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            switch (unit) {
                case 'second':
                case 'seconds':
                    softbanDuration = value * 1000;
                    break;
                case 'minute':
                case 'minutes':
                    softbanDuration = value * 60 * 1000;
                    break;
                case 'hour':
                case 'hours':
                    softbanDuration = value * 60 * 60 * 1000;
                    break;
                case 'day':
                case 'days':
                    softbanDuration = value * 24 * 60 * 60 * 1000;
                    break;
                case 'week':
                case 'weeks':
                    softbanDuration = value * 7 * 24 * 60 * 60 * 1000;
                    break;
                case 'month':
                case 'months':
                    softbanDuration = value * 30 * 24 * 60 * 60 * 1000; 
                    break;
                default:
                    return await interaction.reply({
                        content: 'Please provide a valid time unit (seconds, minutes, hours, days, weeks, months).',
                        flags: MessageFlags.Ephemeral
                    });
            }
            
            expiresAt = new Date(Date.now() + softbanDuration);
        }
        
        panelData.reason = reason;
        if (action === 'timeout') {
            panelData.length = duration;
        }
        if (action === 'ban' || action === 'softban') {
            panelData.deleteMessageSeconds = deleteMessageSeconds;
        }
        client.modPanels.set(panelId, panelData);
        
        const guild = client.guilds.cache.get(panelData.guildId);
        if (!guild) {
            return await interaction.reply({
                content: 'Error: Could not find the server.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        let target;
        try {
            target = await client.users.fetch(panelData.targetId);
        } catch (error) {
            client.logs.error(`[MOD_PANEL] Error fetching target user: ${error}`);
            return await interaction.reply({
                content: 'Error: Could not fetch the target user.',
                flags: MessageFlags.Ephemeral
            });
        }

        let member = null;
        if (action === 'timeout' || action === 'kick') {
            try {
                member = await guild.members.fetch(panelData.targetId);
            } catch (error) {
                client.logs.error(`[MOD_PANEL] Error fetching target member: ${error}`);
                return await interaction.reply({
                    content: 'Error: The target user is no longer a member of this server.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
        
        const createDMEmbed = (actionName, includeLength = false) => {
            const embed = new EmbedBuilder()
                .setColor(client.config.embedModHard)
                .setAuthor({ name: `${client.user.username} Moderation System` })
                .setTitle(`> ${client.config.modEmojiHard} You were **${actionName}** ${actionName === 'timed-out' ? 'in' : 'from'} "${panelData.guildName}" ${client.config.arrowEmoji}`)
                .addFields(
                    { name: 'Server', value: `> ${panelData.guildName} (ID: ${panelData.guildId})`, inline: true },
                    { name: 'Reason', value: `> ${reason}`, inline: true },
                    { name: 'Moderator', value: `> ${panelData.moderatorTag} (ID: ${panelData.moderatorId})`, inline: true }
                )
                .setFooter({ text: `${actionName.charAt(0).toUpperCase() + actionName.slice(1)} from ${panelData.guildName} ${client.config.devBy}` })
                .setTimestamp()
                .setThumbnail(client.user.avatarURL());

            if (includeLength && action === 'timeout') {
                embed.addFields({ name: 'Duration', value: `> ${duration} minute(s)`, inline: true });
            }
            
            if (action === 'ban') {
                const days = Math.floor(deleteMessageSeconds / 86400);
                embed.addFields({ name: 'Message Deletion', value: `> ${days} day(s)`, inline: true });
            }
            
            if (action === 'softban') {
                const days = Math.floor(deleteMessageSeconds / 86400);
                embed.addFields({ 
                    name: 'Message Deletion', 
                    value: `> ${days} day(s)`, 
                    inline: true 
                });
                
                if (softbanDuration > 0) {
                    embed.addFields({ 
                        name: 'Ban Duration', 
                        value: `> ${softbanDurationText} (before automatic unban)`, 
                        inline: true 
                    });
                } else {
                    embed.setDescription('> You have been soft-banned, which means your messages were deleted but you can rejoin immediately.');
                }
            }

            return embed;
        };

        const createActionEmbed = (actionName, includeLength = false) => {
            const embed = new EmbedBuilder()
                .setColor(client.config.embedModHard)
                .setAuthor({ name: `${client.user.username} Moderation System` })
                .setTitle(`> ${client.config.modEmojiHard} User was **${actionName}** ${actionName === 'timed-out' ? 'in' : 'from'} "${panelData.guildName}" ${client.config.arrowEmoji}`)
                .addFields(
                    { name: 'Moderator', value: `> ${panelData.moderatorTag} (ID: ${panelData.moderatorId})`, inline: true },
                    { name: 'User', value: `> ${panelData.targetTag} (ID: ${panelData.targetId})`, inline: true },
                    { name: 'Reason', value: `> ${reason}`, inline: false }
                )
                .setFooter({ text: `${actionName.charAt(0).toUpperCase() + actionName.slice(1)} from ${panelData.guildName} ${client.config.devBy}` })
                .setTimestamp()
                .setThumbnail(client.user.avatarURL());

            if (includeLength && action === 'timeout') {
                embed.addFields({ name: 'Duration', value: `> ${duration} minute(s)`, inline: true });
            }
            
            if (action === 'ban') {
                const days = Math.floor(deleteMessageSeconds / 86400);
                embed.addFields({ name: 'Message Deletion', value: `> ${days} day(s)`, inline: true });
            }
            
            if (action === 'softban') {
                const days = Math.floor(deleteMessageSeconds / 86400);
                embed.addFields({ 
                    name: 'Message Deletion', 
                    value: `> ${days} day(s)`, 
                    inline: true 
                });
                
                if (softbanDuration > 0) {
                    embed.addFields({ 
                        name: 'Ban Duration', 
                        value: `> ${softbanDurationText} (before automatic unban)`, 
                        inline: true 
                    });
                } else {
                    embed.setDescription('> User was banned and then immediately unbanned to delete their recent messages.');
                }
            }

            return embed;
        };
        
        const failEmbed = new EmbedBuilder()
            .setColor(client.config.embedModHard)
            .setDescription(`Failed to moderate **${panelData.targetTag}** (ID: ${panelData.targetId}).`)
            .setFooter({ text: `${client.user.username} Moderation System ${client.config.devBy}` });

        await interaction.deferReply().catch(err => {
            client.logs.error(`[MOD_PANEL] Error deferring modal reply: ${err}`);
        });

        try {
            switch (action) {
                case 'kick':
                    if (!member) {
                        throw new Error('Target member is no longer in the server');
                    }
                    
                    await target.send({ embeds: [createDMEmbed('kicked')] }).catch(() => {
                        client.logs.error('[MOD_PANEL_KICK] Failed to DM user. This can happen when their DMs are off, or the user is a bot.');
                    });
                    
                    await member.kick(`[${panelData.moderatorTag}] ${reason}`).catch(error => {
                        client.logs.error(`[MOD_PANEL_KICK] Error kicking user: ${error}`);
                        throw error;
                    });
                    
                    await interaction.editReply({ embeds: [createActionEmbed('kicked')] });
                    
                    const kickMessage = await interaction.channel.messages.fetch(panelData.messageId).catch(e => null);
                    if (kickMessage) kickMessage.edit({ components: [] }).catch(e => {});
                    break;

                case 'ban':
                    await target.send({ embeds: [createDMEmbed('banned')] }).catch(() => {
                        client.logs.error('[MOD_PANEL_BAN] Failed to DM user. This can happen when their DMs are off, or the user is a bot.');
                    });
                    
                    await guild.members.ban(target, { 
                        reason: `[${panelData.moderatorTag}] ${reason}`,
                        deleteMessageSeconds: deleteMessageSeconds
                    }).catch(error => {
                        client.logs.error(`[MOD_PANEL_BAN] Error banning user: ${error}`);
                        throw error;
                    });
                    
                    await interaction.editReply({ embeds: [createActionEmbed('banned')] });
                    
                    const banMessage = await interaction.channel.messages.fetch(panelData.messageId).catch(e => null);
                    if (banMessage) banMessage.edit({ components: [] }).catch(e => {});
                    break;

                case 'timeout':
                    if (!member) {
                        throw new Error('Target member is no longer in the server');
                    }
                    
                    await target.send({ embeds: [createDMEmbed('timed-out', true)] }).catch(() => {
                        client.logs.error('[MOD_PANEL_TIMEOUT] Failed to DM user. This can happen when their DMs are off, or the user is a bot.');
                    });
                    
                    await member.timeout(duration * 60 * 1000, `[${panelData.moderatorTag}] ${reason}`).catch(error => {
                        client.logs.error(`[MOD_PANEL_TIMEOUT] Error timing out user: ${error}`);
                        throw error;
                    });
                    
                    await interaction.editReply({ embeds: [createActionEmbed('timed-out', true)] });
                    
                    const timeoutMessage = await interaction.channel.messages.fetch(panelData.messageId).catch(e => null);
                    if (timeoutMessage) timeoutMessage.edit({ components: [] }).catch(e => {});
                    break;
                
                case 'softban':
                    await target.send({ embeds: [createDMEmbed('soft-banned')] }).catch(() => {
                        client.logs.error('[MOD_PANEL_SOFTBAN] Failed to DM user. This can happen when their DMs are off, or the user is a bot.');
                    });
                    
                    await guild.members.ban(target, { 
                        reason: `[${panelData.moderatorTag}] [SOFTBAN] ${reason}`,
                        deleteMessageSeconds: deleteMessageSeconds
                    }).catch(error => {
                        client.logs.error(`[MOD_PANEL_SOFTBAN] Error banning user: ${error}`);
                        throw error;
                    });
                    
                    if (softbanDuration > 0) {
                        const softbanEntry = new SoftbanEntry({
                            guildId: panelData.guildId,
                            userId: panelData.targetId,
                            moderatorId: panelData.moderatorId,
                            reason: reason,
                            expiresAt: expiresAt,
                            deleteMessageSeconds: deleteMessageSeconds
                        });
                        
                        await softbanEntry.save().catch(error => {
                            client.logs.error(`[MOD_PANEL_SOFTBAN] Error saving softban to database: ${error}`);
                        });
                        
                        const softbanEmbed = createActionEmbed('soft-banned');
                        softbanEmbed.setDescription(`> User was banned and will be automatically unbanned after ${softbanDurationText}.`);
                        softbanEmbed.addFields({
                            name: 'Auto-unban', 
                            value: '> User will be automatically unbanned without notification.'
                        });
                        await interaction.editReply({ embeds: [softbanEmbed] });
                    } else {
                        await guild.members.unban(target, `[${panelData.moderatorTag}] [SOFTBAN COMPLETE] ${reason}`).catch(error => {
                            client.logs.error(`[MOD_PANEL_SOFTBAN] Error unbanning user: ${error}`);
                            throw error;
                        });
                        
                        const softbanEmbed = createActionEmbed('soft-banned');
                        softbanEmbed.setDescription('> User was banned and then immediately unbanned to delete their recent messages');
                        await interaction.editReply({ embeds: [softbanEmbed] });
                    }
                    
                    const softbanMessage = await interaction.channel.messages.fetch(panelData.messageId).catch(e => null);
                    if (softbanMessage) softbanMessage.edit({ components: [] }).catch(e => {});
                    break;

                default:
                    client.logs.error(`[MOD_PANEL] Unknown action: ${action}`);
                    throw new Error(`Unknown action: ${action}`);
            }
            
            if (client.modPanels.has(panelId)) {
                clearTimeout(client.modPanels.get(panelId).expiryTimeout);
                client.modPanels.delete(panelId);
            }
            
        } catch (error) {
            client.logs.error(`[MOD_PANEL] Action error: ${error}`);
            await interaction.editReply({ 
                embeds: [failEmbed]
            }).catch(err => {
                client.logs.error(`[MOD_PANEL] Error sending fail embed: ${err}`);
            });
        }
    }
};
