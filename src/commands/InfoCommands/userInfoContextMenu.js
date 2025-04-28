const { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder, AttachmentBuilder, ButtonBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');
const { Profile } = require('discord-arts');
const { addBadges } = require('../../lib/discordBadges');
const { addSuffix } = require('../../lib/addSuffix');

module.exports = {
    usableInDms: false,
    category: "Info",
    data: new ContextMenuCommandBuilder()
    .setName('• User Info')
    .setType(ApplicationCommandType.User),
    async execute(interaction, client) {

        await interaction.deferReply();
        const memberOption = interaction.options.getMember("member");
        const member = memberOption || interaction.member;

        try {
            const fetchedMembers = await interaction.guild.members.fetch();

            const profileBuffer = await Profile(member.id);
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

            const Booster = member.premiumSince ? "<:booster:1189781755721429094>" : "✖";

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
            .setAuthor({ name: `User Info Command ${client.config.devBy}`, iconURL: client.user.avatarURL()})
            .setTitle(`${client.user.username} User Info Tool ${client.config.arrowEmoji}`)
            .setColor(client.config.embedInfo)
            .setDescription(`> ${member.user.tag} User Information \nOn <t:${joinTime}:D>, ${member.user.username} Joined as the **${addSuffix(joinPosition)}** member of this guild.`)
            .setImage("attachment://profile.png")
            .setThumbnail(member.user.displayAvatarURL())
            .addFields([
                { name: "Badges", value: `${addBadges(userBadges).join("")}`, inline: true },
                { name: "Booster", value: `${Booster}`, inline: true },
                { name: "Top Roles", value: `${topRoles.join("").replace(`<@${interaction.guildId}>`)}`, inline: false },
                { name: "Created", value: `<t:${createdTime}:R>`, inline: true },
                { name: "Joined", value: `<t:${joinTime}:R>`, inline: true },
                { name: "UserID", value: `${member.id}`, inline: false }])
            .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.avatarURL() })
            .setTimestamp()

            interaction.editReply({ embeds: [Embed], components: [row], files: [imageAttachment] });

        } catch (error) {
            interaction.editReply({ content: `There was an error generating the info for **${member}**`, flags: MessageFlags.Ephemeral });
            throw error;
        }
    }
};