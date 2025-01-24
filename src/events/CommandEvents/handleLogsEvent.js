const { EmbedBuilder, Events } = require("discord.js");

function handleLogs(client) {

    const logSchema = require("../../schemas/auditLoggingSystem");

    function send_log(guildId, embed) {
        logSchema.findOne({ Guild: guildId }, async (err, data) => {
            if (!data || !data.Channel) return;
            const LogChannel = client.channels.cache.get(data.Channel);

            if (!LogChannel) return;
            embed.setTimestamp();

            try {
                LogChannel.send({ embeds: [embed] });
            } catch(err) {
                client.logs.error('[AUDIT_LOGGING] Error sending log message.');
            }
        });
    }

    client.on("messageDelete", function (message) {
        try {
            if (message.guild === null) return;
            if (message.author.bot) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} logging system ${client.config.arrowEmoji}`)
            .setDescription(`${client.config.auditLogEmoji} __Message Deleted__`)
            .setColor('DarkRed')
            .setTimestamp()
            .addFields({ name: `Author`, value: `> <@${message.author.id}> - *${message.author.tag}*`})
            .addFields({ name: `Channel`, value: `> ${message.channel}`})
            .addFields({ name: `Deleted Message`, value: `> ${message.content}`})
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Message Deleted`})

            return send_log(message.guild.id, embed);
        } catch (err) {
            client.logs.error(`[AUDIT_LOGGING] Couldn't log deleted message. Message content: ${message.content ? message.content : 'message was an embed or attachment.'}`);
        }
    });

    // Channel Topic Updating 
    client.on("guildChannelTopicUpdate", (channel, oldTopic, newTopic) => {
        try {
            if (channel.guild === null) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} logging system ${client.config.arrowEmoji}`)
            .setDescription(`📚 __Channel Topic Updated__`)
            .setColor('DarkRed')
            .setTimestamp()
            .addFields({ name: `Channel`, value: `> ${channel}`})
            .addFields({ name: `Old Topic`, value: `> ${oldTopic}`})
            .addFields({ name: `New Topic`, value: `> ${newTopic}`})
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Channel Topic Updated`})

            return send_log(channel.guild.id, embed);
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging channel topic update.');
        }
    });

    // Channel Permission Updating
    client.on("guildChannelPermissionsUpdate", (channel, oldPermissions, newPermissions) => {
        try {
            if (channel.guild === null) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} logging system ${client.config.arrowEmoji}`)
            .setDescription(`📚 __Channel Permissions Updated__`)
            .setColor('DarkRed')
            .setTimestamp()
            .addFields({ name: `Channel`, value: `> ${channel}`})
            .addFields({ name: `Changes`, value: `> Channel's permissions/name were updated`})
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Channel Permissions Updated`})

            return send_log(channel.guild.id, embed);
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging channel permissions update.');
        }
    });

    // unhandled Guild Channel Update
    client.on("unhandledGuildChannelUpdate", (oldChannel, newChannel) => {
        try {

        if (oldChannel.guild === null) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} logging system ${client.config.arrowEmoji}`)
            .setDescription(`📚 __Channel Updated__`)
            .setColor('DarkRed')
            .setTimestamp()
            .addFields({ name: `Channel`, value: `> ${oldChannel}`})
            .addFields({ name: `Changes`, value: `> **${client.user.username}** couldn't find any changes!`})
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Channel Updated`})

            return send_log(oldChannel.guild.id, embed);
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging channel update.');
        }
    });

    // Member Started Boosting
    client.on("guildMemberBoost", (member) => {
        try {

        if (member.guild === null) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
            .setDescription(`<:booster:1189781755721429094> __Member Started Boosting__`)
            .setColor('Purple')
            .setTimestamp()
            .addFields({ name: `Member`, value: `> ${member.user}`})
            .addFields({ name: `Server`, value: `> ${member.guild.name}`})
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Boosting Started`})

            return send_log(member.guild.id, embed);
        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging member boost.');
        }
    });

    // Member Unboosted
    client.on("guildMemberUnboost", (member) => {
        try {

        if (member.guild === null) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
            .setDescription(`<:booster:1189781755721429094> __Member Stopped Boosting__`)
            .setColor('Purple')
            .setTimestamp()
            .addFields({ name: `Member`, value: `> ${member.user}`})
            .addFields({ name: `Server`, value: `> ${member.guild.name}`})
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Boosting Stopped`})

            return send_log(member.guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging member unboost.');
        }
    });

    // Member Got Role
    client.on("guildMemberRoleAdd", (member, role) => {
        try {

        if (member.guild === null) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
            .setDescription(`📫 __Member Received Role__`)
            .setColor('Purple')
            .setTimestamp()
            .addFields({ name: `Member`, value: `> ${member.user}`})
            .addFields({ name: `Role`, value: `> ${role}`})
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Role Added to Member`})

            return send_log(member.guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging member role add.');
        }
    });

    // Member Lost Role
    client.on("guildMemberRoleRemove", (member, role) => {
        try {

        if (member.guild === null) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
            .setDescription(`📫 __Member Lost Role__`)
            .setColor('Purple')
            .setTimestamp()
            .addFields({ name: `Member`, value: `> ${member.user}`})
            .addFields({ name: `Role`, value: `> ${role}`})
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Role Removed from Member`})

            return send_log(member.guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging member role remove.');
        }
    });

    // Nickname Changed
    client.on("guildMemberNicknameUpdate", (member, oldNickname, newNickname) => {
        try {

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
            .setDescription(`🏷️ __Nickname Changed__`)
            .setColor('DarkBlue')
            .setTimestamp()
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Nickname Changed`})
            .addFields({ name: `Member`, value: `> ${member.user}`})
            .addFields({ name: `Old Nickname`, value: `> ${oldNickname || '**None**'}`})
            .addFields({ name: `New Nickname`, value: `> ${newNickname || '**None**'}`})

            return send_log(member.guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging member nickname update.');
        }
    });

    // Member Joined
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
            .setTimestamp()
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Member Joined`})

            return send_log(member.guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging member join.');
        }
    });

    // Member Left
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
            .setTimestamp()
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Member Left`})

            return send_log(member.guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging member leave.');
        }
    });

    // Server Boost Level Up
    client.on("guildBoostLevelUp", (guild, oldLevel, newLevel) => {
        try {

        if (guild === null) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
            .setDescription(`<:booster:1189781755721429094> __Server Boost Level Up__`)
            .setColor('Purple')
            .setTimestamp()
            .addFields({ name: `Info`, value: `> **${guild.name}** advanced from level **${oldLevel}** to **${newLevel}**!`})
            .addFields({ name: `Server`, value: `> ${member.guild.name}`})
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Server Boost Level Up`})

            return send_log(guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging level up.');
        }
    });

    // Server Boost Level Down
    client.on("guildBoostLevelDown", (guild, oldLevel, newLevel) => {
        try {

        if (guild === null) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
            .setDescription(`<:booster:1189781755721429094> __Server Boost Level Down__`)
            .setColor('Purple')
            .setTimestamp()
            .addFields({ name: `Info`, value: `> **${guild.name}** lost a level, from **${oldLevel}** to **${newLevel}**!`})
            .addFields({ name: `Server`, value: `> ${member.guild.name}`})
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Server Boost Level Down`})

            return send_log(guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging level down.');
        }
    });

    // Banner Added
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
            .setFooter({ text: `Guild Banner Added`})
            .setTimestamp()

            return send_log(guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging banner add.');
        }
    })

    // AFK Channel Added
    client.on("guildAfkChannelAdd", (guild, afkChannel) => {
        try {

        if (guild === null) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
            .setDescription(`🎧 __AFK Channel Added__`)
            .setColor('DarkRed')
            .addFields({ name: `AFK Channel`, value: `> ${afkChannel}`})
            .setTimestamp()
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `AFK Channel Added`})

            return send_log(guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging afk channel add.');
        }
    });

    // Guild Vanity Add
    client.on("guildVanityURLAdd", (guild, vanityURL) => {
        try {

        if (guild === null) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
            .setDescription(`${client.config.auditLogEmoji} __Vanity URL Added__`)
            .setColor('Green')
            .setTimestamp()
            .addFields({ name: `Vanity URL`, value: `> ${vanityURL}`})
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Vanity URL Added`})

            return send_log(guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging vanity add.');
        }
    })

    // Guild Vanity Remove
    client.on("guildVanityURLRemove", (guild, vanityURL) => {
        try {

        if (guild === null) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
            .setDescription(`${client.config.auditLogEmoji} __Vanity URL Removed__`)
            .setColor('DarkRed')
            .addFields({ name: `Old Vanity`, value: `> ${vanityURL}`})
            .setTimestamp()
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Vanity URL Removed`})

            return send_log(guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging vanity remove.');
        }
    })

    // Guild Vanity Link Updated
    client.on("guildVanityURLUpdate", (guild, oldVanityURL, newVanityURL) => {
        try {

        if (guild === null) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
            .setDescription(`${client.config.auditLogEmoji} __Vanity URL Updated__`)
            .setColor('DarkRed')
            .addFields({ name: `Old Vanity`, value: `> ${oldVanityURL}`})
            .addFields({ name: `New Vanity`, value: `> ${newVanityURL}`})
            .setTimestamp()
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Vanity URL Updated`})

            return send_log(guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging vanity update.');
        }
    })

    // Message Pinned
    client.on("messagePinned", (message) => {
        try {

        if (message.guild === null) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
            .setDescription(`📌 __Message Pinned__`)
            .setColor('Purple')
            .setTimestamp()
            .addFields({ name: `Pinner`, value: `> ${message.author}`})
            .addFields({ name: `Message`, value: `> ${message.content}`})
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Message Pinned`})

            return send_log(message.guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging message pin.');
        }
    })

    // Message Edited
    client.on("messageContentEdited", (message, oldContent, newContent) => {
        try {

        if (message.guild === null) return;
        if (message.author.bot) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
            .setDescription(`${client.config.auditLogEmoji} __Message Edited__`)
            .setColor('Purple')
            .setTimestamp()
            .addFields({ name: `Member`, value: `> ${message.author}`})
            .addFields({ name: `Old Message`, value: `> ${oldContent}`})
            .addFields({ name: `New Message`, value: `> ${newContent}`})
            .addFields({ name: `Jump to Message`, value: `> [Click here](${message.url})`})
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Message Edited`})

            return send_log(message.guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging message edit.');
        }
    })

    // Role Position Updated
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
            .setTimestamp()
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Role Position Updated`})

            return send_log(role.guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging role position update.');
        }
    })

    // Role Permission Updated
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
            .setTimestamp()
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Role Permissions Updated`})

            return send_log(role.guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging role permissions update.');
        }
    })

    // VC Switch
    client.on("voiceChannelSwitch", (member, oldChannel, newChannel) => {
        try {

        if (member.guild === null) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
            .setDescription(`🔊 __Voice Channel Switched__`)
            .setColor('Purple')
            .setTimestamp()
            .addFields({ name: `Member`, value: `> ${member.user}`})
            .addFields({ name: `From`, value: `> ${oldChannel}`})
            .addFields({ name: `To`, value: `> ${newChannel}`})
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Voice Channel Switched`})

            return send_log(member.guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging voice channel switch.');
        }
    })

    // Role Created
    client.on("roleCreate", (role) => {
        try {

        if (role.guild === null) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
            .setDescription(`📰 __Role Created__`)
            .setColor('Green')
            .setTimestamp()
            .addFields({ name: `Role Name`, value: `> ${role.name}`})
            .addFields({ name: `Role ID`, value: `> ${role.id}`})
            .addFields({ name: `Role HEX`, value: `> ${role.hexColor}`})
            .addFields({ name: `Role Pos`, value: `> ${role.position}`})
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Role Created`})

            return send_log(role.guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging role create.');
        }
    });

    // Role Deleted
    client.on("roleDelete", (role) => {
        try {

        if (role.guild === null) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
            .setDescription(`📰 __Role Deleted__`)
            .setColor('DarkRed')
            .setTimestamp()
            .addFields({ name: `Role Name`, value: `> ${role.name}`})
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Role Deleted`})

        return send_log(role.guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging role delete.');
        }
    });

    // User Banned
    client.on("guildBanAdd", ({guild, user}) => {
        try {

        if (guild === null) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
            .setDescription(`⚒️ __User Banned__`)
            .setColor('DarkRed')
            .setTimestamp()
            .addFields({ name: `Member`, value: `> ${user}`})
            .addFields({ name: `Member ID`, value: `> ${user.id}`})
            .addFields({ name: `Member Tag`, value: `> ${user.tag}`})
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `User Banned`})

            return send_log(guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging ban.');
        }
    });

    // User Unbanned
    client.on("guildBanRemove", ({guild, user}) => {
        try {

        if (guild === null) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
            .setDescription(`⚒️ __User Unbanned__`)
            .setColor('Green')
            .setTimestamp()
            .addFields({ name: `Member`, value: `> ${user}`})
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `User Unbanned`})

            return send_log(guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging unban.');
        }
    });

    // Channel Created
    client.on("channelCreate", (channel) => {
        try {

        if (channel.guild === null) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
            .setDescription(`📚 __Channel Created__`)
            .setColor('Green')
            .setTimestamp()
            .addFields({ name: `Channel`, value: `> ${channel}`})
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Channel Created`})

            return send_log(channel.guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging channel create.');
        }
    });

    // Channel Deleted
    client.on("channelDelete", (channel) => {
        try {

        if (channel.guild === null) return;

            const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} Logging system ${client.config.arrowEmoji}`)
            .setDescription(`📚 __Channel Deleted__`)
            .setColor('DarkRed')
            .setTimestamp()
            .addFields({ name: `Channel`, value: `> ${channel}`})
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Logging System ${client.config.devBy}`})
            .setFooter({ text: `Channel Deleted`})

            return send_log(channel.guild.id, embed);

        } catch (err) {
            client.logs.error('[AUDIT_LOGGING] Error logging channel delete.');
        }
    });
}

module.exports = { handleLogs };