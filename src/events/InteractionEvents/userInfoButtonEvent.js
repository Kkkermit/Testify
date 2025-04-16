const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { color, getTimestamp } = require('../../utils/loggingEffects');
const DmLogger = require('../../schemas/dmLoggerSystem');
const { addBadges } = require('../../lib/discordBadges');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('userinfo-') && !interaction.customId.startsWith('back-')) return;

        try {
            if (interaction.customId.startsWith('userinfo-')) {
                const userId = interaction.customId.split('-')[1];
                
                const user = await client.users.fetch(userId);
                
                if (!user) {
                    return await interaction.reply({ 
                        content: 'Unable to find user information.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }

                const createdAt = user.createdAt;
                const createdTimestamp = Math.floor(createdAt.getTime() / 1000);
                const formattedDate = `<t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)`;

                const userFlags = user.flags?.toArray() || [];
                const badgeEmojis = addBadges(userFlags);
                const badgesDisplay = userFlags.length ? badgeEmojis.join(' ') : 'None';

                const userEmbed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setAuthor({ 
                        name: `User Information for ${user.tag}`,
                        iconURL: user.displayAvatarURL({ dynamic: true })
                    })
                    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 1024 }))
                    .addFields(
                        { name: '👤 User Tag', value: user.tag, inline: true },
                        { name: '🆔 User ID', value: `\`${user.id}\``, inline: true },
                        { name: '🤖 Bot', value: user.bot ? 'Yes' : 'No', inline: true },
                        { name: '🗓️ Account Created', value: formattedDate, inline: false },
                        { name: '🏳️ Badges', value: badgesDisplay, inline: false },
                        { name: '🖼️ Avatar', value: `[Link to avatar](${user.displayAvatarURL({ dynamic: true, size: 4096 })})`, inline: false }
                    )
                    .setFooter({ text: `DM Logger ${client.config.devBy}` })
                    .setTimestamp();
                
                const backButton = new ButtonBuilder()
                    .setCustomId(`back-${interaction.message.id}-${userId}`)
                    .setLabel('Back to Message')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️');

                const respondButton = new ButtonBuilder()
                    .setCustomId(`respond-${userId}`)
                    .setLabel('Respond')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💬');

                const row = new ActionRowBuilder()
                    .addComponents(backButton, respondButton);

                await interaction.update({
                    embeds: [userEmbed],
                    components: [row]
                });
            }
            
            else if (interaction.customId.startsWith('back-')) {
                const parts = interaction.customId.split('-');
                const messageId = parts[1];
                const userId = parts[2];
                
                try {
                    const messageData = await DmLogger.findOne({ messageId: messageId });
                    
                    if (!messageData) {
                        const user = await client.users.fetch(userId);
                        if (!user) {
                            return await interaction.reply({ 
                                content: 'Unable to find user information for this message.', 
                                flags: MessageFlags.Ephemeral 
                            });
                        }
                        
                        const basicEmbed = new EmbedBuilder()
                            .setColor('#9B59B6')
                            .setAuthor({ 
                                name: `${user.tag} sent a direct message!`,
                                iconURL: user.displayAvatarURL({ dynamic: true })
                            })
                            .setTitle(`📨 Direct Message ${client.config.arrowEmoji}`)
                            .setDescription(`> Original message content not available.`)
                            .addFields(
                                { name: '⏰ Message Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                            )
                            .setFooter({ text: `DM Logger ${client.config.devBy}` })
                            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                            .setTimestamp();
                        
                        const userInfoButton = new ButtonBuilder()
                            .setCustomId(`userinfo-${user.id}`)
                            .setLabel('User Info')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('👤');
                            
                        const respondButton = new ButtonBuilder()
                            .setCustomId(`respond-${user.id}`)
                            .setLabel('Respond')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('💬');

                        const row = new ActionRowBuilder()
                            .addComponents(userInfoButton, respondButton);
                        
                        return await interaction.update({
                            embeds: [basicEmbed],
                            components: [row]
                        });
                    }

                    const user = await client.users.fetch(messageData.authorId);
                    
                    if (!user) {
                        return await interaction.reply({ 
                            content: 'Unable to find user information.', 
                            flags: MessageFlags.Ephemeral 
                        });
                    }

                    const createdTimestamp = Math.floor(messageData.timestamp.getTime() / 1000);
                    
                    const originalEmbed = new EmbedBuilder()
                        .setColor('#9B59B6')
                        .setAuthor({ 
                            name: `${user.tag} sent a direct message!`,
                            iconURL: user.displayAvatarURL({ dynamic: true })
                        })
                        .setTitle(`📨 New Direct Message ${client.config.arrowEmoji}`)
                        .setDescription(`> ${messageData.content || "No message content. Possibly only attachments were sent."}`)
                        .addFields(
                            { name: '⏰ Message Time', value: `<t:${createdTimestamp}:F>`, inline: false }
                        )
                        .setFooter({ text: `DM Logger ${client.config.devBy}` })
                        .setTimestamp(messageData.timestamp);

                    if (messageData.hasAttachments && messageData.attachmentsData.length > 0) {
                        let attachmentsList = '';
                        
                        messageData.attachmentsData.forEach((attachment, index) => {
                            attachmentsList += `• [Attachment ${index + 1}](${attachment.url})\n`;
                        });
                        
                        originalEmbed.addFields({ name: '📎 Attachments', value: attachmentsList });
                        
                        const firstAttachment = messageData.attachmentsData[0];
                        if (firstAttachment && 
                            (firstAttachment.contentType?.startsWith('image/') || 
                             /\.(jpg|jpeg|png|gif|webp)$/i.test(firstAttachment.name))) {
                            originalEmbed.setImage(firstAttachment.url);
                        }
                    }

                    const userInfoButton = new ButtonBuilder()
                        .setCustomId(`userinfo-${user.id}`)
                        .setLabel('User Info')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('👤');
                        
                    const respondButton = new ButtonBuilder()
                        .setCustomId(`respond-${user.id}`)
                        .setLabel('Respond')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('💬');

                    const row = new ActionRowBuilder()
                        .addComponents(userInfoButton, respondButton);

                    await interaction.update({
                        embeds: [originalEmbed],
                        components: [row]
                    });
                } catch (dbError) {
                    console.error(`${color.red}[${getTimestamp()}] [BUTTON] Database error:${color.reset}`, dbError);
                    
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: 'Unable to retrieve the original message. Database error occurred.',
                            flags: MessageFlags.Ephemeral
                        });
                    }
                }
            }
            
        } catch (error) {
            console.error(`${color.red}[${getTimestamp()}] [BUTTON] Error handling button interaction:${color.reset}`, error);
            
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'An error occurred while processing this interaction.',
                        flags: MessageFlags.Ephemeral
                    });
                }
            } catch (replyError) {
                console.error(`${color.red}[${getTimestamp()}] [BUTTON] Error sending error response:${color.reset}`, replyError);
            }
        }
    },
};
