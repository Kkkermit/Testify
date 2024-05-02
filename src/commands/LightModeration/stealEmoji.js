const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, PermissionFlagsBits } = require('discord.js');
const { default: axios } = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('steal')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
    .setDescription('Adds specified emoji to the server.')
    .addStringOption(option => option.setName('emoji').setDescription('Specified emoji will be added to the server.').setRequired(true))
    .addStringOption(option => option.setName('name').setDescription('Specified name will be applied to specified new emoji.').setRequired(true)),
    async execute(interaction, client) {

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true});

        let emoji = interaction.options.getString('emoji')?.trim();
        const name = interaction.options.getString('name');

        if (emoji.startsWith("<") && emoji.endsWith(">")) {
            const id = emoji.match(/\d{15,}/g)[0];

            const type = await axios.get(`https://cdn.discordapp.com/emojis/${id}.gif`)
            .then(image => {
                if (image) return "gif"
                else return "png"
            }).catch(err => {
                return "png"
            })

            emoji = `https://cdn.discordapp.com/emojis/${id}.${type}?quality=lossless`
        }

        let emojiErr = 'You **cannot** add default emojis to your server.'

        if (!emoji.startsWith('http')) {
            return await interaction.reply({ content: `${emojiErr}`, ephemeral: true})
        }

        if (!emoji.startsWith('https')) {
            return await interaction.reply({ content: `${emojiErr}`, ephemeral: true})
        }

        interaction.guild.emojis.create({ attachment: `${emoji}`, name: `${name}` })
        .then(emoji => {
            const embed = new EmbedBuilder()
            .setColor(client.config.embedModLight)
            .setAuthor({ name: `${client.user.username} steal emoji command ${client.config.devBy}`})
            .setFooter({ text: `Emoji heist successful`})
            .setTimestamp()
            .setTitle(`${client.config.modEmojiLight} Emoji added to **${interaction.guild.name}**`)
            .setDescription(`Emoji Details \n\n> ${emoji} added with the name of **${name}**\n\n`)
            .setThumbnail(client.user.avatarURL())
            
            interaction.reply({ content: `Embed sent to channel`, ephemeral: true})
            return interaction.channel.send({ embeds: [embed] });
        }).catch(err => {
            interaction.reply({ content: `This emoji **failed** to upload, perhaps you have reached your **emoji limit**?`, ephemeral: true})
        })
    }
}