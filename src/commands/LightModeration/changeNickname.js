const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('nick')
    .setDescription(`Change specified user's nickname.`)
    .setDefaultMemberPermissions(PermissionFlagsBits.ChangeNickname)
    .addStringOption(option => option.setName('nick').setDescription(`Specified nickname will become specified user's new nickname.`).setRequired(true).setMaxLength(32).setMinLength(1))
    .addUserOption(option => option.setName('user').setDescription(`Specified user's nickname will be changed.`).setRequired(true)),
    async execute(interaction, client) {

        const nick = await interaction.options.getString('nick');
        const user = await interaction.options.getUser('user');
        const member = await interaction.options.getMember('user');

        if (user === interaction.user || user === null) {

            if (!interaction.member.permissions.has(PermissionFlagsBits.ChangeNickname)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true});

            await interaction.member.setNickname(nick).catch(err => {
                return interaction.reply({ content: `**Couldn't** change your nickname! **Check** my permissions and **role position** and try again.`, ephemeral: true });
            })

            const embedUserChange = new EmbedBuilder()
            .setColor(client.config.embedModLight)
            .setAuthor({ name: `Nickname Command ${client.config.devBy}` })
            .setTitle(`${client.user.username} Nickname Tool ${client.config.arrowEmoji}`)
            .setDescription(`> Your nickname has been set to **${nick}**`)
            .setFooter({ text: `Nickname has been set!` })
            .setThumbnail(client.user.displayAvatarURL())
            .setTimestamp();

            await interaction.reply({ embeds: [embedUserChange], ephemeral: true})

        } else {

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageNicknames)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true });
            else {

                await member.setNickname(nick).catch(err => {
                    return interaction.reply({ content: `**Couldn't** change the nickname of **${user}**! **Check** my permissions and **role position** and try again.`, ephemeral: true });
                });

                const embedMemberChange = new EmbedBuilder()
                .setColor(client.config.embedModLight)
                .setAuthor({ name: `Nickname Command ${client.config.devBy}` })
                .setTitle(`${client.user.username} Nickname Tool ${client.config.arrowEmoji}`)
                .setDescription(`> ${user}'s nickname has been set to **${nick}**`)
                .setFooter({ text: `Nickname changed by ${interaction.user.username}` })
                .setThumbnail(client.user.displayAvatarURL())
                .setTimestamp();
            
                await interaction.reply({ embeds: [embedMemberChange], ephemeral: true})
            }
        }
    }
}