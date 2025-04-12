const { EmbedBuilder } = require("discord.js");
const logSchema = require("../../schemas/auditLoggingSystem");

function handleLogs(client) {
    async function send_log(guildId, embed, logType) {
        try {
            const data = await logSchema.findOne({ Guild: guildId });
            if (!data || !data.Channel) return;
            
            // If this log type isn't enabled for this guild, return
            if (!data.EnabledLogs.includes("all") && !data.EnabledLogs.includes(logType)) return;
            
            const LogChannel = client.channels.cache.get(data.Channel);
            if (!LogChannel) return;
            
            embed.setTimestamp();
            await LogChannel.send({ embeds: [embed] });
        } catch(err) {
            client.logs.error(`[AUDIT_LOGGING] Error sending log message: ${err}`);
        }
    }

    // Message Delete - messageEvents
    client.on("messageDelete", function (message) {
        try {
            if (message.guild === null) return;
            if (message.author.bot) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} logging system ${client.config.arrowEmoji}`)
                .setDescription(`${client.config.auditLogEmoji} __Message Deleted__`)
                .setColor('DarkRed')
                .addFields({ name: `Author`, value: `> <@${message.author.id}> - *${message.author.tag}*`})
                .addFields({ name: `Channel`, value: `> ${message.channel}`})
                .addFields({ name: `Deleted Message`, value: `> ${message.content}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Message Deleted`});

            return send_log(message.guild.id, embed, "messageEvents");
        } catch (err) {
            client.logs.error(`[AUDIT_LOGGING] Couldn't log deleted message. Message content: ${message.content ? message.content : 'message was an embed or attachment.'} in ${message.guild.name} (${message.guild.id})`);
        }
    });

    // Channel Topic Updating - channelEvents
    client.on("guildChannelTopicUpdate", (channel, oldTopic, newTopic) => {
        try {
            if (channel.guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} logging system ${client.config.arrowEmoji}`)
                .setDescription(`📚 __Channel Topic Updated__`)
                .setColor('DarkRed')
                .addFields({ name: `Channel`, value: `> ${channel}`})
                .addFields({ name: `Old Topic`, value: `> ${oldTopic}`})
                .addFields({ name: `New Topic`, value: `> ${newTopic}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Channel Topic Updated`});

            return send_log(channel.guild.id, embed, "channelEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging channel topic update.');
        }
    });

    // Channel Permission Updating - channelEvents
    client.on("guildChannelPermissionsUpdate", (channel, oldPermissions, newPermissions) => {
        try {
            if (channel.guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} logging system ${client.config.arrowEmoji}`)
                .setDescription(`📚 __Channel Permissions Updated__`)
                .setColor('DarkRed')
                .addFields({ name: `Channel`, value: `> ${channel}`})
                .addFields({ name: `Changes`, value: `> Channel's permissions/name were updated`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Channel Permissions Updated`});

            return send_log(channel.guild.id, embed, "channelEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging channel permissions update.');
        }
    });

    // unhandled Guild Channel Update - channelEvents
    client.on("unhandledGuildChannelUpdate", (oldChannel, newChannel) => {
        try {
            if (oldChannel.guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} logging system ${client.config.arrowEmoji}`)
                .setDescription(`📚 __Channel Updated__`)
                .setColor('DarkRed')
                .addFields({ name: `Channel`, value: `> ${oldChannel}`})
                .addFields({ name: `Changes`, value: `> **${client.user.username}** couldn't find any changes!`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Channel Updated`});

            return send_log(oldChannel.guild.id, embed, "channelEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging channel update.');
        }
    });

    // Member Started Boosting - boostEvents
    client.on("guildMemberBoost", (member) => {
        try {
            if (member.guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`<:booster:1189781755721429094> __Member Started Boosting__`)
                .setColor('Purple')
                .addFields({ name: `Member`, value: `> ${member.user}`})
                .addFields({ name: `Server`, value: `> ${member.guild.name}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Boosting Started`});

            return send_log(member.guild.id, embed, "boostEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging member boost.');
        }
    });

    // Member Unboosted - boostEvents
    client.on("guildMemberUnboost", (member) => {
        try {
            if (member.guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`<:booster:1189781755721429094> __Member Stopped Boosting__`)
                .setColor('Purple')
                .addFields({ name: `Member`, value: `> ${member.user}`})
                .addFields({ name: `Server`, value: `> ${member.guild.name}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Boosting Stopped`});

            return send_log(member.guild.id, embed, "boostEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging member unboost.');
        }
    });

    // Member Got Role - memberEvents
    client.on("guildMemberRoleAdd", (member, role) => {
        try {
            if (member.guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`📫 __Member Received Role__`)
                .setColor('Purple')
                .addFields({ name: `Member`, value: `> ${member.user}`})
                .addFields({ name: `Role`, value: `> ${role}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Role Added to Member`});

            return send_log(member.guild.id, embed, "memberEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging member role add.');
        }
    });

    // Member Lost Role - memberEvents
    client.on("guildMemberRoleRemove", (member, role) => {
        try {
            if (member.guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`📫 __Member Lost Role__`)
                .setColor('Purple')
                .addFields({ name: `Member`, value: `> ${member.user}`})
                .addFields({ name: `Role`, value: `> ${role}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Role Removed from Member`});

            return send_log(member.guild.id, embed, "memberEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging member role remove.');
        }
    });

    // Nickname Changed - memberEvents
    client.on("guildMemberNicknameUpdate", (member, oldNickname, newNickname) => {
        try {
            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`🏷️ __Nickname Changed__`)
                .setColor('DarkBlue')
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Nickname Changed`})
                .addFields({ name: `Member`, value: `> ${member.user}`})
                .addFields({ name: `Old Nickname`, value: `> ${oldNickname || '**None**'}`})
                .addFields({ name: `New Nickname`, value: `> ${newNickname || '**None**'}`});

            return send_log(member.guild.id, embed, "memberEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging member nickname update.');
        }
    });

    // Member Joined - memberEvents
    client.on("guildMemberAdd", (member) => {
        try {
            if (member.guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`📥 __Member Joined__`)
                .setColor('Green')
                .addFields({ name: `Member`, value: `> ${member.user}`})
                .addFields({ name: `Member ID`, value: `> ${member.user.id}`})
                .addFields({ name: `Member Tag`, value: `> ${member.user.tag}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Member Joined`});

            return send_log(member.guild.id, embed, "memberEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging member join.');
        }
    });

    // Member Left - memberEvents
    client.on("guildMemberRemove", (member) => {
        try {
            if (member.guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`📤 __Member Left__`)
                .setColor('DarkRed')
                .addFields({ name: `Member`, value: `> ${member.user}`})
                .addFields({ name: `Member ID`, value: `> ${member.user.id}`})
                .addFields({ name: `Member Tag`, value: `> ${member.user.tag}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Member Left`});

            return send_log(member.guild.id, embed, "memberEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging member leave.');
        }
    });

    // Server Boost Level Up - boostEvents
    client.on("guildBoostLevelUp", (guild, oldLevel, newLevel) => {
        try {
            if (guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`<:booster:1189781755721429094> __Server Boost Level Up__`)
                .setColor('Purple')
                .addFields({ name: `Info`, value: `> **${guild.name}** advanced from level **${oldLevel}** to **${newLevel}**!`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Server Boost Level Up`});

            return send_log(guild.id, embed, "boostEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging level up.');
        }
    });

    // Server Boost Level Down - boostEvents
    client.on("guildBoostLevelDown", (guild, oldLevel, newLevel) => {
        try {
            if (guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`<:booster:1189781755721429094> __Server Boost Level Down__`)
                .setColor('Purple')
                .addFields({ name: `Info`, value: `> **${guild.name}** lost a level, from **${oldLevel}** to **${newLevel}**!`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Server Boost Level Down`});

            return send_log(guild.id, embed, "boostEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging level down.');
        }
    });

    // Banner Added - serverEvents
    client.on("guildBannerAdd", (guild, bannerURL) => {
        try {
            if (guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`⚒️ __Guild Banner Added__`)
                .setColor('Purple')
                .addFields({ name: `Banner URL`, value: `> ${bannerURL}`})
                .setImage(bannerURL)
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Guild Banner Added`});

            return send_log(guild.id, embed, "serverEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging banner add.');
        }
    });

    // AFK Channel Added - serverEvents
    client.on("guildAfkChannelAdd", (guild, afkChannel) => {
        try {
            if (guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`🎧 __AFK Channel Added__`)
                .setColor('DarkRed')
                .addFields({ name: `AFK Channel`, value: `> ${afkChannel}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `AFK Channel Added`});

            return send_log(guild.id, embed, "serverEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging afk channel add.');
        }
    });

    // Guild Vanity Add - serverEvents
    client.on("guildVanityURLAdd", (guild, vanityURL) => {
        try {
            if (guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`${client.config.auditLogEmoji} __Vanity URL Added__`)
                .setColor('Green')
                .addFields({ name: `Vanity URL`, value: `> ${vanityURL}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Vanity URL Added`});

            return send_log(guild.id, embed, "serverEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging vanity add.');
        }
    });

    // Guild Vanity Remove - serverEvents
    client.on("guildVanityURLRemove", (guild, vanityURL) => {
        try {
            if (guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`${client.config.auditLogEmoji} __Vanity URL Removed__`)
                .setColor('DarkRed')
                .addFields({ name: `Old Vanity`, value: `> ${vanityURL}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Vanity URL Removed`});

            return send_log(guild.id, embed, "serverEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging vanity remove.');
        }
    });

    // Guild Vanity Link Updated - serverEvents
    client.on("guildVanityURLUpdate", (guild, oldVanityURL, newVanityURL) => {
        try {
            if (guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`${client.config.auditLogEmoji} __Vanity URL Updated__`)
                .setColor('DarkRed')
                .addFields({ name: `Old Vanity`, value: `> ${oldVanityURL}`})
                .addFields({ name: `New Vanity`, value: `> ${newVanityURL}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Vanity URL Updated`});

            return send_log(guild.id, embed, "serverEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging vanity update.');
        }
    });

    // Message Pinned - messageEvents
    client.on("messagePinned", (message) => {
        try {
            if (message.guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`📌 __Message Pinned__`)
                .setColor('Purple')
                .addFields({ name: `Pinner`, value: `> ${message.author}`})
                .addFields({ name: `Message`, value: `> ${message.content}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Message Pinned`});

            return send_log(message.guild.id, embed, "messageEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging message pin.');
        }
    });

    // Message Edited - messageEvents
    client.on("messageContentEdited", (message, oldContent, newContent) => {
        try {
            if (message.guild === null) return;
            if (message.author.bot) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`${client.config.auditLogEmoji} __Message Edited__`)
                .setColor('Purple')
                .addFields({ name: `Member`, value: `> ${message.author}`})
                .addFields({ name: `Old Message`, value: `> ${oldContent}`})
                .addFields({ name: `New Message`, value: `> ${newContent}`})
                .addFields({ name: `Jump to Message`, value: `> [Click here](${message.url})`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Message Edited`});

            return send_log(message.guild.id, embed, "messageEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging message edit.');
        }
    });

    // Role Position Updated - roleEvents
    client.on("rolePositionUpdate", (role, oldPosition, newPosition) => {
        try {
            if (role.guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`🗃️ __Role Position Updated__`)
                .setColor('DarkRed')
                .addFields({ name: `Role`, value: `> ${role}`})
                .addFields({ name: `Old Position`, value: `> ${oldPosition}`})
                .addFields({ name: `New Position`, value: `> ${newPosition}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Role Position Updated`});

            return send_log(role.guild.id, embed, "roleEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging role position update.');
        }
    });

    // Role Permission Updated - roleEvents
    client.on("rolePermissionsUpdate", (role, oldPermissions, newPermissions) => {
        try {
            if (role.guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`🗃️ __Role Permissions Updated__`)
                .setColor('DarkRed')
                .addFields({ name: `Role`, value: `> ${role}`})
                .addFields({ name: `Old Permissions`, value: `> ${oldPermissions}`})
                .addFields({ name: `New Permissions`, value: `> ${newPermissions}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Role Permissions Updated`});

            return send_log(role.guild.id, embed, "roleEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging role permissions update.');
        }
    });

    // VC Switch - voiceEvents
    client.on("voiceChannelSwitch", (member, oldChannel, newChannel) => {
        try {
            if (member.guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`🔊 __Voice Channel Switched__`)
                .setColor('Purple')
                .addFields({ name: `Member`, value: `> ${member.user}`})
                .addFields({ name: `From`, value: `> ${oldChannel}`})
                .addFields({ name: `To`, value: `> ${newChannel}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Voice Channel Switched`});

            return send_log(member.guild.id, embed, "voiceEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging voice channel switch.');
        }
    });

    // Voice Channel Join - voiceEvents
    client.on("voiceChannelJoin", (member, channel) => {
        try {
            if (member.guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`🔊 __Voice Channel Joined__`)
                .setColor('Green')
                .addFields({ name: `Member`, value: `> ${member.user}`})
                .addFields({ name: `Channel`, value: `> ${channel}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Voice Channel Joined`});

            return send_log(member.guild.id, embed, "voiceEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging voice channel join.');
        }
    });

    // Voice Channel Leave - voiceEvents
    client.on("voiceChannelLeave", (member, channel) => {
        try {
            if (member.guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`🔊 __Voice Channel Left__`)
                .setColor('DarkRed')
                .addFields({ name: `Member`, value: `> ${member.user}`})
                .addFields({ name: `Channel`, value: `> ${channel}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Voice Channel Left`});

            return send_log(member.guild.id, embed, "voiceEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging voice channel leave.');
        }
    });

    // Voice State Update (mute/deaf) - voiceEvents
    client.on("voiceStateUpdate", (oldState, newState) => {
        try {
            if (oldState.guild === null) return;
            if (oldState.channelId === newState.channelId) {
                // Only tracking mute/deaf changes here, joins/leaves/switches handled by other events
                const member = oldState.member;
                
                // Check for mute state changes
                if (oldState.serverMute !== newState.serverMute) {
                    const muteStatus = newState.serverMute ? "Muted" : "Unmuted";
                    
                    const embed = new EmbedBuilder()
                        .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                        .setDescription(`🔊 __Member ${muteStatus}__`)
                        .setColor(newState.serverMute ? 'DarkRed' : 'Green')
                        .addFields({ name: `Member`, value: `> ${member.user}`})
                        .addFields({ name: `Channel`, value: `> <#${newState.channelId}>`})
                        .addFields({ name: `Status`, value: `> Server ${muteStatus}`})
                        .setThumbnail(client.user.avatarURL())
                        .setAuthor({ name: `Logging System ${client.config.devBy}`})
                        .setFooter({ text: `Voice State Update`});

                    return send_log(oldState.guild.id, embed, "voiceEvents");
                }
                
                // Check for deaf state changes
                if (oldState.serverDeaf !== newState.serverDeaf) {
                    const deafStatus = newState.serverDeaf ? "Deafened" : "Undeafened";
                    
                    const embed = new EmbedBuilder()
                        .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                        .setDescription(`🔊 __Member ${deafStatus}__`)
                        .setColor(newState.serverDeaf ? 'DarkRed' : 'Green')
                        .addFields({ name: `Member`, value: `> ${member.user}`})
                        .addFields({ name: `Channel`, value: `> <#${newState.channelId}>`})
                        .addFields({ name: `Status`, value: `> Server ${deafStatus}`})
                        .setThumbnail(client.user.avatarURL())
                        .setAuthor({ name: `Logging System ${client.config.devBy}`})
                        .setFooter({ text: `Voice State Update`});

                    return send_log(oldState.guild.id, embed, "voiceEvents");
                }
            }
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging voice state update.');
        }
    });

    // Unhandled Voice State Update - voiceEvents
    client.on("unhandledVoiceStateUpdate", (oldState, newState) => {
        try {
            if (oldState.guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`🔊 __Voice State Updated__`)
                .setColor('Purple')
                .addFields({ name: `Member`, value: `> ${oldState.member.user}`})
                .addFields({ name: `Status`, value: `> Voice state was updated in an unhandled way`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Unhandled Voice State Update`});

            return send_log(oldState.guild.id, embed, "voiceEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging unhandled voice state update.');
        }
    });

    client.on("guildMemberVoiceStateUpdate", (member, oldState, newState) => {})

    // Role Created - roleEvents
    client.on("roleCreate", (role) => {
        try {
            if (role.guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`📰 __Role Created__`)
                .setColor('Green')
                .addFields({ name: `Role Name`, value: `> ${role.name}`})
                .addFields({ name: `Role ID`, value: `> ${role.id}`})
                .addFields({ name: `Role HEX`, value: `> ${role.hexColor}`})
                .addFields({ name: `Role Pos`, value: `> ${role.position}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Role Created`});

            return send_log(role.guild.id, embed, "roleEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging role create.');
        }
    });

    // Role Deleted - roleEvents
    client.on("roleDelete", (role) => {
        try {
            if (role.guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`📰 __Role Deleted__`)
                .setColor('DarkRed')
                .addFields({ name: `Role Name`, value: `> ${role.name}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Role Deleted`});

            return send_log(role.guild.id, embed, "roleEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging role delete.');
        }
    });

    // User Banned - moderationEvents
    client.on("guildBanAdd", ({guild, user}) => {
        try {
            if (guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`⚒️ __User Banned__`)
                .setColor('DarkRed')
                .addFields({ name: `Member`, value: `> ${user}`})
                .addFields({ name: `Member ID`, value: `> ${user.id}`})
                .addFields({ name: `Member Tag`, value: `> ${user.tag}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `User Banned`});

            return send_log(guild.id, embed, "moderationEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging ban.');
        }
    });

    // User Unbanned - moderationEvents
    client.on("guildBanRemove", ({guild, user}) => {
        try {
            if (guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`⚒️ __User Unbanned__`)
                .setColor('Green')
                .addFields({ name: `Member`, value: `> ${user}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `User Unbanned`});

            return send_log(guild.id, embed, "moderationEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging unban.');
        }
    });

    // Channel Created - channelEvents
    client.on("channelCreate", (channel) => {
        try {
            if (channel.guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`📚 __Channel Created__`)
                .setColor('Green')
                .addFields({ name: `Channel`, value: `> ${channel}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Channel Created`});

            return send_log(channel.guild.id, embed, "channelEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging channel create.');
        }
    });

    // Channel Deleted - channelEvents
    client.on("channelDelete", (channel) => {
        try {
            if (channel.guild === null) return;

            const embed = new EmbedBuilder()
                .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
                .setDescription(`📚 __Channel Deleted__`)
                .setColor('DarkRed')
                .addFields({ name: `Channel`, value: `> ${channel}`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Logging System ${client.config.devBy}`})
                .setFooter({ text: `Channel Deleted`});

            return send_log(channel.guild.id, embed, "channelEvents");
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging channel delete.');
        }
    });

}

module.exports = { handleLogs };
