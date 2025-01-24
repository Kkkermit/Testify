const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock the specified channel.')
    .addChannelOption(option => option.setName('channel').setDescription('The channel you want to lock').addChannelTypes(ChannelType.GuildText).setRequired(true)),
    async execute(interaction, client) {

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true});

        let channel = interaction.options.getChannel('channel');

        channel.permissionOverwrites.create(interaction.guild.id, {SendMessages: false})

        const embed = new EmbedBuilder()
        .setColor(client.config.embedModHard)
        .setAuthor({ name: `Lock Command ${client.config.devBy}`})
        .setTimestamp()
        .setTitle(`${client.config.modEmojiHard} ${client.user.username} has locked a channel ${client.config.arrowEmoji}`)
        .setDescription(`> **Channel:** ${channel} has been locked by **${interaction.user.username}**!`)
        .setFooter({ text: `Channel Locked`})

        await interaction.reply({ content: `Message sent to channel`, ephemeral: true });
        await channel.send({ embeds: [embed] });
    }
}