const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');

module.exports = {
    usableInDms: false,
    category: "Moderation",
    permissions: [PermissionFlagsBits.ManageChannels],
    data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock the specified channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(option => option.setName('channel').setDescription('The channel you want to lock').addChannelTypes(ChannelType.GuildText).setRequired(true)),
    async execute(interaction, client) {

        let channel = interaction.options.getChannel('channel');

        channel.permissionOverwrites.create(interaction.guild.id, {SendMessages: false})

        const embed = new EmbedBuilder()
        .setColor(client.config.embedModHard)
        .setAuthor({ name: `Lock Command ${client.config.devBy}`})
        .setTimestamp()
        .setTitle(`${client.config.modEmojiHard} ${client.user.username} has locked a channel ${client.config.arrowEmoji}`)
        .setDescription(`> **Channel:** ${channel} has been locked by **${interaction.user.username}**!`)
        .setFooter({ text: `Channel Locked`})

        await interaction.reply({ content: `Message sent to channel`, flags: MessageFlags.Ephemeral });
        await channel.send({ embeds: [embed] });
    }
}