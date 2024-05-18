const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionsBitField, PermissionFlagsBits } = require('discord.js');
const voiceSchema = require('../../schemas/voiceChannelMembersSystem');
const botSchema = require('../../schemas/voiceChannelBotSystem');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('members-vc')
    .setDMPermission(false)
    .setDescription('Configure your members voice channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(command => command.setName('total-set').setDescription('Sets your total members voice channel.').addChannelOption(option => option.setName('voice-channel').setDescription('Specified voice channel wll be your total members voice channel.').setRequired(true).addChannelTypes(ChannelType.GuildVoice)))
    .addSubcommand(command => command.setName('total-remove').setDescription('Removes your total members VC.'))
    .addSubcommand(command => command.setName('bot-set').setDescription('Sets your total bots voice channel.').addChannelOption(option => option.setName('voice-channel').setDescription('Specified voice channel wll be your total bots voice channel.').setRequired(true).addChannelTypes(ChannelType.GuildVoice)))
    .addSubcommand(command => command.setName('bot-remove').setDescription('Removes your total bots VC.')),
    async execute(interaction, client, err) {

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true});

        const sub = interaction.options.getSubcommand();

        switch (sub) {
            case 'total-set':

            const voiceData = await voiceSchema.findOne({ Guild: interaction.guild.id });
            const voiceChannel = interaction.options.getChannel('voice-channel');
            const voiceTotalChannel = await interaction.guild.channels.cache.get(voiceChannel.id);

            if (!voiceData) {

                await voiceSchema.create({
                    Guild: interaction.guild.id,
                    TotalChannel: voiceChannel.id
                })

                voiceTotalChannel.setName(`• Total Members: ${interaction.guild.memberCount}`).catch(err);

                const voiceEmbed = new EmbedBuilder()
                .setColor(client.config.embedModLight)
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Member Voice Tool ${client.config.devBy}`})
                .setTimestamp()
                .setTitle(`${client.user.username} Member Voice Tool ${client.config.arrowEmoji}`)
                .setDescription(`> Total Members channel has \n> been set up`)
                .addFields({ name: `• Channel was Set Up`, value: `> Your channel (${voiceChannel}) has been set \n> up to be your total members \n> voice channel! It will now display your \n> total members accordingly.`})
                .setFooter({ text: `🔊 Total Channel Set`})

                await interaction.reply({ embeds: [voiceEmbed], ephemeral: true })

            } else {
                await interaction.reply({ content: `You have **already** set up a **total members** VC in this server!`, ephemeral: true})
            }

            break;
            case 'total-remove':

            const totalRemoveData = await voiceSchema.findOne({ Guild: interaction.guild.id });

            if (!totalRemoveData) return await interaction.reply({ content: `You **have not** set up a **total members** VC yet, cannot delete **nothing**..`, ephemeral: true});
            else {

                const removeChannel = await interaction.guild.channels.cache.get(totalRemoveData.TotalChannel);

                if (!removeChannel) {

                    await voiceSchema.deleteMany({ Guild: interaction.guild.id });
                    await interaction.reply({ content: `Your **total member** VC seems to be corrupt or non existent, we **disabled** it regardless!`, ephemeral: true});

                } else {

                    await removeChannel.delete().catch(err => {
                        voiceSchema.deleteMany({ Guild: interaction.guild.id });
                        return interaction.reply({ content: `**Couldn't** delete your VC, but we **still** disabled your **total members** VC!`, ephemeral: true})
                    });

                    await voiceSchema.deleteMany({ Guild: interaction.guild.id });
                    await interaction.reply({ content: `Your **total members** VC has been **successfully** disabled!`, ephemeral: true});
                }
            }

            break;
            case 'bot-set':

            const botData = await botSchema.findOne({ Guild: interaction.guild.id });
            const botChannel = interaction.options.getChannel('voice-channel');
            const botGuildChannel = await interaction.guild.channels.cache.get(botChannel.id);
            const botCount = interaction.guild.members.cache.filter(member => member.user.bot).size;

            if (!botData) {

                await botSchema.create({
                    Guild: interaction.guild.id,
                    BotChannel: botChannel.id
                })

                botGuildChannel.setName(`• Total Bots: ${botCount}`).catch(err);

                const botEmbed = new EmbedBuilder()
                .setColor(client.config.embedModLight)
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Bot Voice Tool ${client.config.devBy}` })
                .setTimestamp()
                .setTitle(`${client.user.username} Bot Voice Tool ${client.config.arrowEmoji}`)
                .setDescription(`> Total Bots channel has \n> been set up`)
                .addFields({ name: `• Channel was Set Up`, value: `> Your channel (${botGuildChannel}) has been set \n> up to be your total bots \n> voice channel! It will now display your \n> total bots accordingly.`})
                .setFooter({ text: `🔊 Total Channel Set`})

                await interaction.reply({ embeds: [botEmbed], ephemeral: true })
            } else {
                await interaction.reply({ content: `You have **already** set up a **total bots** VC in this server!`, ephemeral: true})
            }

            break;
            case 'bot-remove':

            const totalBotData = await botSchema.findOne({ Guild: interaction.guild.id });

            if (!totalBotData) return await interaction.reply({ content: `You **have not** set up a **total bots** VC yet, cannot delete **nothing**..`, ephemeral: true});
            else {

                const removeBotChannel = await interaction.guild.channels.cache.get(totalBotData.BotChannel);

                if (!removeBotChannel) {

                    await botSchema.deleteMany({ Guild: interaction.guild.id });
                    await interaction.reply({ content: `Your **total bots** VC seems to be corrupt or non existent, we **disabled** it regardless!`, ephemeral: true});

                } else {

                    await removeBotChannel.delete().catch(err => {
                        botSchema.deleteMany({ Guild: interaction.guild.id });
                        return interaction.reply({ content: `**Couldn't** delete your VC, but we **still** disabled your **total bots** VC!`, ephemeral: true})
                    });

                    await botSchema.deleteMany({ Guild: interaction.guild.id });
                    await interaction.reply({ content: `Your **total bots** VC has been **successfully** disabled!`, ephemeral: true});
                }
            }
        }

    }

}