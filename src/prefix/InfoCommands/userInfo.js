const { EmbedBuilder, AttachmentBuilder, ButtonBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');
const { Profile } = require('discord-arts');
const { addBadges } = require('../../lib/discordBadges');
const { addSuffix } = require('../../lib/addSuffix');

module.exports = {
    name: 'userinfo',
    aliases: ['users', 'user'],
    description: 'Get information about a user',
    usage: 'userinfo <user>',
    category: 'Info',
    usableInDms: false,
    async execute(message, client, args) {

        const user = message.guild.members.cache.get(args[1]) || message.mentions.members.first() || message.member;

        if (!user) return message.channel.send({ content: "Member **could not** be found!", flags: MessageFlags.Ephemeral,});

        const profileBuffer = await Profile(user.id);
        const imageAttachment = new AttachmentBuilder(profileBuffer, { name: 'profile.png' });

        const joinPosition = Array.from(message.guild.members.cache
        .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp)
        .keys())
        .indexOf(user.id) + 1;

        const topRoles = user.roles.cache
        .sort((a, b) => b.position - a.position)
        .map(role => role)
        .slice(0, 3);

        const userBadges = user.user.flags.toArray();

        const joinTime = parseInt(user.joinedTimestamp / 1000);
        const createdTime = parseInt(user.user.createdTimestamp / 1000);

        const Booster = user.premiumSince ? "<:booster:1189781755721429094>" : "✖";

        const avatarButton = new ButtonBuilder()
        .setLabel('Avatar')
        .setStyle(5)
        .setURL(user.displayAvatarURL());

        const bannerButton = new ButtonBuilder()
        .setLabel('Banner')
        .setStyle(5)
        .setURL((await user.user.fetch()).bannerURL() || 'https://example.com/default-banner.jpg');

        const row = new ActionRowBuilder()
        .addComponents(avatarButton, bannerButton);

        const Embed = new EmbedBuilder()
        .setAuthor({ name: `User Info Command ${client.config.devBy}`, iconURL: client.user.avatarURL()})
        .setTitle(`${client.user.username} User Info Tool ${client.config.arrowEmoji}`)
        .setColor(client.config.embedInfo)
        .setDescription(`> ${user.user.tag} User Information \nOn <t:${joinTime}:D>, ${user.user.username} Joined as the **${addSuffix(joinPosition)}** member of this guild.`)
        .setImage("attachment://profile.png")
        .setThumbnail(user.user.displayAvatarURL())
        .addFields([
            { name: "Badges", value: `${addBadges(userBadges).join("")}`, inline: true },
            { name: "Booster", value: `${Booster}`, inline: true },
            { name: "Top Roles", value: `${topRoles.join("").replace(`<@${message.guildId}>`)}`, inline: false },
            { name: "Created", value: `<t:${createdTime}:R>`, inline: true },
            { name: "Joined", value: `<t:${joinTime}:R>`, inline: true },
            { name: "UserID", value: `${user.id}`, inline: false }])
        .setFooter({ text: `Requested by ${message.author.username}`, iconURL: message.author.avatarURL() })
        .setTimestamp();

        await message.channel.send({ embeds: [Embed], files: [imageAttachment], components: [row] });
    }
}
