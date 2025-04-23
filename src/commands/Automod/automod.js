const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    usableInDms: false,
    category: "Moderation",
    permissions: [PermissionFlagsBits.Administrator],
    data: new SlashCommandBuilder()
    .setName("automod")
    .setDescription("Setup Automod for your server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(command => command.setName("flagged-words").setDescription("Blocks profanity, specific content, and slurs from being sent."))
    .addSubcommand(command => command.setName("spam-messages").setDescription("Stops spam from being sent."))
    .addSubcommand(command => command.setName("mention-spam").setDescription("Stops users from spam pinging members.").addIntegerOption(option => option.setName("number").setDescription("Specified amount will be used as the max mention amount.").setRequired(true)))
    .addSubcommand(command => command.setName("keyword").setDescription("Block a specified word in the Server.").addStringOption(option => option.setName("word").setDescription("Specified word will be blocked from being sent.").setRequired(true))),
    async execute (interaction, client) {
        const { guild, options } = interaction;
        const sub = options.getSubcommand();

        let author = "Automod Tool"
        let loadingRule = `Loading your **automod rule**..`

        switch (sub) {
            case "flagged-words":

            await interaction.reply({ content: `${loadingRule}`});

            const rule = await guild.autoModerationRules.create({
                name: `Block profanity, sexual content, and slurs by ${client.user.username}.`,
                creatorId: process.env.clientid,
                enabled: true,
                eventType: 1,
                triggerType: 4,
                triggerMetadata: 
                    {
                        presets: [1, 2, 3]
                    },
                actions: [
                    {
                        type: 1,
                        metadata: {
                            channel: interaction.channel,
                            durationSeconds: 10,
                            customMessage: `This message was prevented by ${client.user.username}!`
                        }
                    }
                ]
            }).catch(async err => {
                setTimeout(async () => {
                    return await interaction.editReply({ content: `${err}`});
                }, 2000)
            })

            setTimeout(async () => {
                if (!rule) return;

                const embed = new EmbedBuilder()
                .setColor(client.config.embedAutomod)
                .setTimestamp()
                .setDescription(`> ${client.config.automodEmoji}  Automod Role added`)
                .addFields({ name: `• Automod Rule`, value: `> Flagged Words rule added`})
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `${author}`})
                .setFooter({ text: `Flagged Words enabled`})

                await interaction.editReply({
                    content: ``,
                    embeds: [embed]
                })
            }, 3000)

            break;

            case 'keyword':

            await interaction.reply({ content: `${loadingRule}`});
            const word = options.getString("word");

            const rule2 = await guild.autoModerationRules.create({
                name: `Prevent the word ${word} by ${client.user.username}.`,
                creatorId: process.env.clientid,
                enabled: true,
                eventType: 1,
                triggerType: 1,
                triggerMetadata: 
                    {
                        keywordFilter: [`${word}`]
                    },
                actions: [
                    {
                        type: 1,
                        metadata: {
                            channel: interaction.channel,
                            durationSeconds: 10,
                            customMessage: `This message was prevented by ${client.user.username}.`
                        }
                    }
                ]
            }).catch(async err => {
                setTimeout(async () => {
                    return await interaction.editReply({ content: `${err}`})
                }, 2000)
            })
 
            setTimeout(async () => {
                if (!rule2) return;
 
                const embed2 = new EmbedBuilder()
                .setColor(client.config.embedAutomod)
                .setTitle(`> ${client.config.automodEmoji}  Keyword Filter added`)
                .setAuthor({ name: `${author}`})
                .setFooter({ text: `Keyword Added`})
                .setTimestamp()
                .addFields({ name: `• Automod Rule`, value: `> Your automod rule has been created. Messages \n> with **${word}** will be deleted`})
                .setThumbnail(client.user.avatarURL())

                await interaction.editReply({
                    content: ``,
                    embeds: [embed2]
                })
            }, 3000)

            break;

            case 'spam-messages':

            await interaction.reply({ content: `${loadingRule}`});


            const rule3 = await guild.autoModerationRules.create({
                name: `Prevent Spam Messages by ${client.user.username}.`,
                creatorId: process.env.clientid,
                enabled: true,
                eventType: 1,
                triggerType: 5,
                triggerMetadata: 
                    {
                        mentionTotalLimit: 3,
                    },
                actions: [
                    {
                        type: 1,
                        metadata: {
                            channel: interaction.channel,
                            durationSeconds: 10,
                            customMessage: `This message was prevented by ${client.user.username}.`
                        }
                    }
                ]
            }).catch(async err => {
                setTimeout(async () => {
                    return await interaction.editReply({ content: `${err}`})
                }, 2000)
            })

            setTimeout(async () => {
                if (!rule3) return;

                const embed3 = new EmbedBuilder()
                .setColor(client.config.embedAutomod)
                .setTitle(`> ${client.config.automodEmoji}  Spam Filter added`)
                .setAuthor({ name: `${author}`})
                .setFooter({ text: `Spam Rule added`})
                .setTimestamp()
                .addFields({ name: `• Automod Rule`, value: `> Spam Rule added, all spam messages \n> will be deleted.`})
                .setThumbnail(client.user.avatarURL())            

                await interaction.editReply({
                    content: ``,
                    embeds: [embed3]
                })
            }, 3000)

            break;

            case 'mention-spam': 
            await interaction.reply({ content: `${loadingRule}`});
            const number =  options.getInteger("number")

            const rule4 = await guild.autoModerationRules.create({
                name: `Prevent Spam Mentions by ${client.user.username}.`,
                creatorId: process.env.clientid,
                enabled: true,
                eventType: 1,
                triggerType: 5,
                triggerMetadata: 
                    {
                        mentionTotalLimit: number
                    },
                actions: [
                    {
                        type: 1,
                        metadata: {
                            channel: interaction.channel,
                            durationSeconds: `This message was prevented by ${client.user.username}.`
                        }
                    }
                ]
            }).catch(async err => {
                setTimeout(async () => {
                    return await interaction.editReply({ content: `${err}`})
                }, 2000)
            })

            setTimeout(async () => {
                if (!rule4) return;

                const embed4 = new EmbedBuilder()
                .setColor(client.config.embedAutomod)
                .setTitle(`> ${client.config.automodEmoji}  Spam Mention Filter added`)
                .setAuthor({ name: `${author}`})
                .setFooter({ text: `Spam Mention Rule added`})
                .setTimestamp()
                .addFields({ name: `• Automod Rule`, value: `> Spam Mention Rule added, all spam messages \n> will be deleted.`})
                .setThumbnail(client.user.avatarURL())

                await interaction.editReply({
                    content: ``,
                    embeds: [embed4]
                })
            }, 3000)
            break;
        }
    }
}
