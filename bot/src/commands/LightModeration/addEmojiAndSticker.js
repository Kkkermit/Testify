const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, PermissionFlagsBits } = require('discord.js');
const { default: axios } = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('add')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
    .setDescription('Adds specified emoji to the server.')
    .addSubcommand(command => command.setName('emoji').setDescription('Specified emoji will be added to the server.').addStringOption(option => option.setName('emoji').setDescription('Specified emoji will be added to the server.').setRequired(true)).addStringOption(option => option.setName('name').setDescription('Specified name will be applied to specified new emoji.').setRequired(true)))
    .addSubcommand(command => command.setName('sticker').setDescription('Adds specified sticker to the server.').addAttachmentOption(option => option.setName('sticker').setDescription('Upload the sticker png/jpeg').setRequired(true)).addStringOption(option => option.setName('name').setDescription('The name of the sicker').setRequired(true))),
    async execute(interaction, client) {

        const sub = interaction.options.getSubcommand();
        
        switch (sub) {
            case 'emoji':

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
                .setFooter({ text: `Emoji heist successful | Added by ${interaction.user.username}`})
                .setTimestamp()
                .setTitle(`${client.config.modEmojiLight} Emoji added to **${interaction.guild.name}** ${client.config.arrowEmoji}`)
                .setDescription(`Emoji Details \n\n> ${emoji} added with the name of **${name}**\n\n`)
                .setThumbnail(client.user.avatarURL())
                
                interaction.reply({ content: `Embed sent to channel`, ephemeral: true})
                return interaction.channel.send({ embeds: [embed] });
            }).catch(err => {
                interaction.reply({ content: `This emoji **failed** to upload, perhaps you have reached your **emoji limit**?`, ephemeral: true})
            })

            break;
            case 'sticker':

            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true});

            const upload = interaction.options.getAttachment('sticker');
            const StickerName = interaction.options.getString('name');

            if (StickerName.length <= 2) return await interaction.reply({ content: `Your name **has to be greater** than \`\`2\`\` characters`, ephemeral: true });
            if (upload.contentType === 'image/gif') return await interaction.reply({ content: `You **cannot** upload gif files at this time`, ephemeral: true });

            await interaction.reply(`Uploading your sticker...`);

            const sticker = await interaction.guild.stickers.create({ file: `${upload.attachment}`, name: `${StickerName}`}).catch(err => {
                setTimeout(() =>{
                    return interaction.editReply({ content: `${err.rawError.message}`});
                }, 2000);
            });

            const embed = new EmbedBuilder()
            .setAuthor({ name: `Sticker Command ${client.config.devBy}` })
            .setTitle(`${client.user.username} Sticker Tool ${client.config.arrowEmoji}`)
            .setColor(client.config.embedModLight)
            .setThumbnail(client.user.displayAvatarURL())
            .setDescription(`> ${client.config.modEmojiLight} Your sticker has been added with the name \`${StickerName}\``)
            .setFooter({ text: `Sticker has been added!` })
            .setTimestamp();

            setTimeout(() => {
                if (!sticker) return;

                interaction.editReply({ content: ``, embeds: [embed]});
            }, 3000);
        };
    },
};