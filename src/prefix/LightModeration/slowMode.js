const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
    name: "slowmode",
    aliases: ["slow", "sm"],
    description: "Set slowmode in a channel",
    usage: "slowmode <set|off|check> [duration]",
    category: "Moderation",
    usableInDms: false,
    async execute(message, client, args) {
        if (!args.length) {
            return message.reply("Please specify a subcommand: `set`, `off`, or `check`");
        }

        const sub = args[0].toLowerCase();

        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return await message.channel.send({ content: `${client.config.noPerms}`, flags: MessageFlags.Ephemeral});

        const mentionedChannel = message.mentions.channels.first();
        const channel = mentionedChannel || message.channel;

        switch (sub) {
            case 'set':
                if (args.length < 2) {
                    return message.reply("Please provide a duration in seconds for the slowmode");
                }

                const duration = parseInt(args[1]);

                if (isNaN(duration) || duration < 0 || duration > 21600) {
                    return message.reply("Slowmode duration must be between **0** and **21600** seconds.");
                }

                try {
                    await channel.setRateLimitPerUser(duration);

                    const slowmodeEmbed = new EmbedBuilder()
                        .setColor(client.config.embedModColor)
                        .setAuthor({ name: `Slowmode Command`, iconURL: client.user.displayAvatarURL() })
                        .setTitle(`${client.user.username} slowmode tool ${client.config.arrowEmoji}`)
                        .setDescription(`> Slowmode set to **${duration}** seconds in ${channel}.`)
                        .setTimestamp()
                        .setFooter({ text: `Slowmode has been activated by ${message.author.username}`, iconURL: message.author.displayAvatarURL() });

                    await message.reply({ embeds: [slowmodeEmbed] });
                } catch (error) {
                    client.logs.error("Failed to set slowmode:", error);
                    return message.reply("Failed to set slowmode in this channel. This could be due to lack of permissions or just a one off. Please try again.");
                }
                break;

            case 'off':
                try {
                    await channel.fetch();
                    const currentSlowmode = channel.rateLimitPerUser;

                    if (currentSlowmode === 0) {
                        return message.reply(`Slowmode can't be disabled in ${channel} as it's not enabled. Please enable slowmode first.`);
                    }

                    await channel.setRateLimitPerUser(0);

                    const slowmodeEmbed = new EmbedBuilder()
                        .setColor(client.config.embedModColor)
                        .setAuthor({ name: `Slowmode Command`, iconURL: client.user.displayAvatarURL() })
                        .setTitle(`${client.user.username} slowmode tool ${client.config.arrowEmoji}`)
                        .setDescription(`> Slowmode has now been **disabled** in ${channel}.`)
                        .setTimestamp()
                        .setFooter({ text: `Slowmode has been disabled by ${message.author.username}`, iconURL: message.author.displayAvatarURL() });

                    await message.reply({ embeds: [slowmodeEmbed] });
                } catch (error) {
                    client.logs.error("Failed to disable slowmode:", error);
                    return message.reply("Failed to disable slowmode in this channel. This could be due to lack of permissions or just a one off. Please try again.");
                }
                break;

            case 'check':
                try {
                    await channel.fetch();
                    const slowmode = channel.rateLimitPerUser;

                    if (slowmode === 0) {
                        return message.reply(`Slowmode has yet to be enabled in ${channel}.`);
                    }

                    const slowmodeCheckEmbed = new EmbedBuilder()
                        .setColor(client.config.embedModColor)
                        .setAuthor({ name: `Slowmode Command`, iconURL: client.user.displayAvatarURL() })
                        .setTitle(`${client.user.username} slowmode tool ${client.config.arrowEmoji}`)
                        .setDescription(`> Slowmode is set to **${slowmode}** seconds in ${channel}.`)
                        .setTimestamp()
                        .setFooter({ text: `Slowmode is enabled. Checked by ${message.author.username}`, iconURL: message.author.displayAvatarURL() });

                    await message.reply({ embeds: [slowmodeCheckEmbed] });
                } catch (error) {
                    client.logs.error("Failed to check slowmode:", error);
                    return message.reply("Failed to check slowmode status in this channel. This could be due to lack of permissions or just a one off. Please try again.");
                }
                break;

            default:
                return message.reply("Invalid subcommand. Please use `set`, `off`, or `check`.");
        }
    }
};
