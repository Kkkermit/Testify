const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { color, getTimestamp } = require('../../utils/loggingEffects');
const DmLogger = require('../../schemas/dmLoggerSystem');
const { getMessagePrefix } = require('../../utils/getMessagePrefix');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.guild !== null || message.author.bot) return;

        try {
            const dmLogChannelId = client.config.dmLoggingChannel;

            if (!dmLogChannelId) {
                console.error(`${color.red}[${getTimestamp()}] [DM_LOGGER] DM log channel not found. Channel ID: ${dmLogChannelId}${color.reset}`);
                return;
            }

            const prefix = await getMessagePrefix(message, client);

            if(message.content.startsWith(prefix)) {
                return;
            }

            const dmLogChannel = client.channels.cache.get(dmLogChannelId);
            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setAuthor({ 
                    name: `${message.author.tag} sent a direct message!`,
                    iconURL: message.author.displayAvatarURL({ dynamic: true })
                })
                .setTitle(`📨 New Direct Message ${client.config.arrowEmoji}`)
                .setDescription(`> ${message.content || "No message content. Possibly only attachments were sent."}`)
                .addFields(
                    { name: '⏰ Message Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                )
                .setFooter({ text: `DM Logger ${client.config.devBy}` })
                .setTimestamp();

            let attachmentData = [];

            if (message.attachments.size > 0) {
                const attachments = Array.from(message.attachments.values());
                let attachmentsList = '';
                
                attachments.forEach((attachment, index) => {
                    attachmentsList += `• [Attachment ${index + 1}](${attachment.url})\n`;
                    
                    attachmentData.push({
                        url: attachment.url,
                        name: attachment.name,
                        contentType: attachment.contentType
                    });
                });
                
                embed.addFields({ name: '📎 Attachments', value: attachmentsList });
                
                const firstAttachment = attachments[0];
                if (firstAttachment && 
                    (firstAttachment.contentType?.startsWith('image/') || 
                     /\.(jpg|jpeg|png|gif|webp)$/i.test(firstAttachment.name))) {
                    embed.setImage(firstAttachment.url);
                }
            }

            const userInfoButton = new ButtonBuilder()
                .setCustomId(`userinfo-${message.author.id}`)
                .setLabel('User Info')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('👤');
                
            const respondButton = new ButtonBuilder()
                .setCustomId(`respond-${message.author.id}`)
                .setLabel('Respond')
                .setStyle(ButtonStyle.Success)
                .setEmoji('💬');

            const row = new ActionRowBuilder()
                .addComponents(userInfoButton, respondButton);

            const sentMessage = await dmLogChannel.send({
                embeds: [embed],
                components: [row]
            });

            if (sentMessage && sentMessage.id) {
                try {
                    await DmLogger.create({
                        messageId: sentMessage.id,
                        authorId: message.author.id,
                        content: message.content || '',
                        timestamp: new Date(),
                        hasAttachments: message.attachments.size > 0,
                        attachmentsData: attachmentData
                    });
                } catch (dbError) {
                    console.error(`${color.red}[${getTimestamp()}] [DM_LOGGER] Error storing in database:${color.reset}`, dbError);
                }
            }
            console.log(`${color.blue}[${getTimestamp()}] [DM_LOGGER] Received DM from ${message.author.tag} (${message.author.id})${color.reset}`);
        } catch (error) {
            console.error(`${color.red}[${getTimestamp()}] [DM_LOGGER] Error sending DM to channel:${color.reset}`, error);
        }
    },
};
