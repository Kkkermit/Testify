const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const { profileImage } = require('discord-arts');

module.exports = {
    data: new SlashCommandBuilder()
    .setName("user-info")
    .setDescription("Display a users information")
    .setDMPermission(false)
    .addUserOption((option) => option.setName("member").setDescription("View member information")),

    async execute(interaction, client) {

    await interaction.deferReply();
    const memberOption = interaction.options.getMember("member");
    const member = memberOption || interaction.member;

    if (member.user.bot) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder().setDescription("At this moment, the bot isn't supported for the bots.")
        ],
        ephemeral: true
      });
    }

    try {
      const fetchedMembers = await interaction.guild.members.fetch();

      const profileBuffer = await profileImage(member.id);
      const imageAttachment = new AttachmentBuilder(profileBuffer, { name: 'profile.png' });

      const joinPosition = Array.from(fetchedMembers
        .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp)
        .keys())
        .indexOf(member.id) + 1;

      const topRoles = member.roles.cache
        .sort((a, b) => b.position - a.position)
        .map(role => role)
        .slice(0, 3);

      const userBadges = member.user.flags.toArray();

      const joinTime = parseInt(member.joinedTimestamp / 1000);
      const createdTime = parseInt(member.user.createdTimestamp / 1000);

      const Booster = member.premiumSince ? "<:discordboost:1136752072369377410>" : "✖";

      const avatarButton = new ButtonBuilder()
        .setLabel('Avatar')
        .setStyle(5)
        .setURL(member.displayAvatarURL());

      const bannerButton = new ButtonBuilder()
        .setLabel('Banner')
        .setStyle(5)
        .setURL((await member.user.fetch()).bannerURL() || 'https://example.com/default-banner.jpg');

      const row = new ActionRowBuilder()
        .addComponents(avatarButton, bannerButton);

      const Embed = new EmbedBuilder()
        .setAuthor({ name: `${member.user.tag} | General Information`, iconURL: member.displayAvatarURL() })
        .setColor('Aqua')
        .setDescription(`On <t:${joinTime}:D>, ${member.user.username} Joined as the **${addSuffix(joinPosition)}** member of this guild.`)
        .setImage("attachment://profile.png")
        .addFields([
          { name: "Badges", value: `${addBadges(userBadges).join("")}`, inline: true },
          { name: "Booster", value: `${Booster}`, inline: true },
          { name: "Top Roles", value: `${topRoles.join("").replace(`<@${interaction.guildId}>`)}`, inline: false },
          { name: "Created", value: `<t:${createdTime}:R>`, inline: true },
          { name: "Joined", value: `<t:${joinTime}:R>`, inline: true },
          { name: "UserId", value: `${member.id}`, inline: false },
        ]);

      interaction.editReply({ embeds: [Embed], components: [row], files: [imageAttachment] });

    } catch (error) {
      interaction.editReply({ content: "An error in the code" });
      throw error;
    }
  }
};

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
    "HypeSquadOnlineHouse1": "<:bravery:1189779986517860382>", // bravery
    "HypeSquadOnlineHouse2": "<:brilliance:1189780421983088681>", // brilliance
    "HypeSquadOnlineHouse3": "<:balance:1189780198556708924>", // balance
    "Hypesquad": "<:hypersquad:1189780607673303060>",
    "CertifiedModerator": "<:mod:1240380119109996615>",
    "VerifiedDeveloper": "<:verifieddev:1189781284294242324>",
  };

  return badgeNames.map(badgeName => badgeMap[badgeName] || '❔');
}
