const { EmbedBuilder, AttachmentBuilder, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const { profileImage } = require('discord-arts');

module.exports = {
    name: 'userinfo',
    aliases: ['users', 'user'],
    async execute(message, client, args) {

        const user = message.guild.members.cache.get(args[1]) || message.mentions.members.first() || message.member;

        if (!user) return message.channel.send({ content: "Member **could not** be found!", ephemeral: true,});

        const profileBuffer = await profileImage(user.id);
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

function addSuffix(number) {
    if (number % 100 >= 11 && number % 100 <= 13)
    return number + "th";

    switch (number % 10) {
        case 1: return number + "st";
        case 2: return number + "nd";
        case 3: return number + "rd";
    }
    return number + "th";
}

function addBadges(badgeNames) {
    if (!badgeNames.length) return ["X"];
    const badgeMap = {
        "ActiveDeveloper": "<:VisualDev:1111819318951419944> ",
        "BugHunterLevel1": "<:bughunter:1189779614143365120>",
        "BugHunterLevel2": "<:bughunter2:1189779791142977629>",
        "PremiumEarlySupporter": "<:early:1240379450835865691>",
        "Partner": "<:partner:1189780724115574865>",
        "Staff": "<:partner:1189781064575623178>",
        "HypeSquadOnlineHouse1": "<:bravery:1189779986517860382>", 
        "HypeSquadOnlineHouse2": "<:brilliance:1189780421983088681>", 
        "HypeSquadOnlineHouse3": "<:balance:1189780198556708924>", 
        "Hypesquad": "<:hypersquad:1189780607673303060>",
        "CertifiedModerator": "<:mod:1240380119109996615>",
        "VerifiedDeveloper": "<:verifieddev:1189781284294242324>",
    };

    return badgeNames.map(badgeName => badgeMap[badgeName] || '❔');
}