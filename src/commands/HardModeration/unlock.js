const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    usableInDms: false,
    category: "Moderation",
    permissions: [PermissionFlagsBits.ManageChannels],
    data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock the specified channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(option => option.setName('channel').setDescription('The channel you want to unlock').addChannelTypes(ChannelType.GuildText).setRequired(true)),
    async execute(interaction, client) {

        let channel = interaction.options.getChannel('channel');

        channel.permissionOverwrites.create(interaction.guild.id, { SendMessages: true })

        const embed = new EmbedBuilder()
        .setColor(client.config.embedModHard)
        .setAuthor({ name: `Unlock Command ${client.config.devBy}`})
        .setTimestamp()
        .setTitle(`${client.config.modEmojiHard} ${client.user.username} has unlocked a channel ${client.config.arrowEmoji}`)
        .setDescription(`> **Channel:** ${channel} has been unlocked by **${interaction.user.username}**!`)
        .setFooter({ text: `Channel Unlocked`})

        await interaction.reply({ content: `Message sent to channel`, flags: MessageFlags.Ephemeral });
        await channel.send({ embeds: [embed] });
    }
}