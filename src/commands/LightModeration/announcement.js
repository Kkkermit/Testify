const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Announce something in the server!")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option => option.setName("channel").setDescription("The announcement channel").addChannelTypes(ChannelType.GuildAnnouncement).setRequired(true))
    .addStringOption(option => option.setName("title").setDescription("The title of the announcement").setRequired(false))
    .addStringOption(option => option.setName("description").setDescription("The description of this announcement").setRequired(false))
    .addStringOption(option => option.setName("color").setDescription("The color of the announcement")
    .addChoices(
        { name: "Aqua", value: "#00FFFF" },
        { name: "Blurple", value: "#7289DA" },
        { name: "Fuchsia", value: "#FF00FF" },
        { name: "Gold", value: "#FFD700" },
        { name: "Green", value: "#008000" },
        { name: "Grey", value: "#808080" },
        { name: "Greyple", value: "#7D7F9A" },
        { name: "Light-grey", value: "#D3D3D3" },
        { name: "Luminous-vivid-pink", value: "#FF007F" },
        { name: "Navy", value: "#000080" },
        { name: "Not-quite-black", value: "#232323" },
        { name: "Orange", value: "#FFA500" },
        { name: "Purple", value: "#800080" },
        { name: "Red", value: "#FF0000" },
        { name: "White", value: "#FFFFFF" },
        { name: "Yellow", value: "#FFFF00" },
        { name: "Blue", value: "#0000FF" }
    ).setRequired(false)),
    async execute (interaction, client) {

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true});
        const channelID = interaction.options.getChannel("channel");
        const title = interaction.options.getString("title") || "NEW ANNOUNCEMENT!";
        const desc = interaction.options.getString("description") || "*No description provided.*";
        const color = interaction.options.getString("color") || client.config.embedColor;
        const user = interaction.user.id;

        const embed = new EmbedBuilder()
        .setTitle(`${title}`)
        .setDescription(`${desc}`)
        .addFields({ name: "Moderator:", value: `<@${user}>`, inline: false})
        .setColor(color)
        .setTimestamp()

        const channel = interaction.client.channels.cache.get(`${channelID.id}`);

        channel.send({ embeds: [embed] }).catch(err => {
            return;
        });

        const sentEmbed = new EmbedBuilder()
        .setAuthor({ name: `Announcement Command ${client.config.devBy}` })
        .setTitle(`${client.user.username} Announcement Tool ${client.config.arrowEmoji}`)
        .setColor(client.config.embedModLight)
        .setDescription(`> Announcement has been sent in <#${channelID.id}>`)
        .setFooter({ text: `Announcement has been sent!` })
        .setTimestamp();

        return interaction.reply({ embeds: [sentEmbed], ephemeral: true });
    }
}