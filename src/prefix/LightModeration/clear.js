const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color, getTimestamp } = require('../../utils/loggingEffects');

module.exports = {
    name: 'clear',
    aliases: ['purge', 'delete'],
    description: 'Delete a specified number of messages from the channel.',
    usage: 'clear <number> [user]',
    category: 'Moderation',
    usableInDms: false,
    permissions: [PermissionFlagsBits.ManageMessages],
    async execute(message, client, args) {
        if (!args.length) {
            return message.reply('Please provide the number of messages to clear!');
        }

        const amount = args[0];
        const userMention = message.mentions.users.first();

        if (isNaN(amount) || parseInt(amount) < 1 || parseInt(amount) > 99) {
            return message.reply('Please provide a **valid** number between `1` and `99`.');
        }
        
        let processingMsg;
        try {
            processingMsg = await message.reply('Processing message deletion...');
        } catch (err) {
            console.error(`${color.red}[${getTimestamp()}] [CLEAR_COMMAND] Failed to send processing message: `, err);
        }

        try {
            await message.delete().catch(err => {
                console.error(`${color.red}[${getTimestamp()}] [CLEAR_COMMAND] Failed to delete command message: `, err);
            });
        } catch (err) {
        }

        const result = await deleteMessages(message.channel, parseInt(amount), userMention);
        
        if (result.error) {
            if (processingMsg) {
                try {
                    await processingMsg.delete();
                } catch (err) {
                }
            }
            
            if (result.code === 50034) {
                return message.channel.send('**Error**: Cannot delete messages older than 14 days. Try a smaller range or target more recent messages.');
            } else {
                return message.channel.send(`**Error**: ${result.error}`);
            }
        }
        
        const deletedUser = userMention ? userMention.username : 'everyone';
        
        const clearEmbed = new EmbedBuilder()
            .setAuthor({ name: `Purge Command`, iconURL: client.user.displayAvatarURL() })
            .setColor(client.config.embedModLight)
            .setTitle(`${client.user.username} Purge Tool ${client.config.arrowEmoji}`)
            .setDescription(`> Successfully deleted **${result.deleted}** messages sent by **${deletedUser}** in **${message.channel}**.`)
            .setFooter({ text: `Purged by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        if (processingMsg) {
            try {
                await processingMsg.delete();
            } catch (err) {
            }
        }

        try {
            const successMsg = await message.channel.send({ embeds: [clearEmbed] });

            setTimeout(() => {
                successMsg.delete().catch(() => {
                });
            }, 5000);
        } catch (err) {
            console.error(`${color.red}[${getTimestamp()}] [CLEAR_COMMAND] Failed to send success message: `, err);
        }
    }
};

async function deleteMessages(channel, totalToDelete, user) {
    let remaining = totalToDelete;
    let totalDeleted = 0;

    try {
        while (remaining > 0) {
            const fetchAmount = Math.min(remaining, 100);
            const messages = await channel.messages.fetch({ limit: fetchAmount });

            if (messages.size === 0) break;

            const toDelete = user 
                ? messages.filter(msg => msg.author.id === user.id)
                : messages;

            if (toDelete.size === 0) break;
            
            try {
                const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
                const recentMessages = toDelete.filter(msg => msg.createdTimestamp > twoWeeksAgo);
                
                if (recentMessages.size === 0) {
                    return { 
                        error: 'All selected messages are older than 14 days and cannot be bulk deleted.', 
                        deleted: totalDeleted,
                        code: 50034
                    };
                }
                
                await channel.bulkDelete(recentMessages);
                totalDeleted += recentMessages.size;
                
                if (recentMessages.size < toDelete.size) {
                    return { 
                        deleted: totalDeleted,
                        warning: 'Some messages were older than 14 days and couldn\'t be deleted.',
                        code: 50034
                    };
                }
            } catch (error) {
                if (error.code === 50034) {
                    return { 
                        error: 'You can only bulk delete messages that are under 14 days old.', 
                        deleted: totalDeleted,
                        code: 50034
                    };
                }
                throw error;
            }

            remaining -= fetchAmount;
            if (messages.size < fetchAmount) break;
        }

        return { deleted: totalDeleted };
    } catch (error) {
        console.error(`${color.red}[${getTimestamp()}] [CLEAR_COMMAND] `, error);
        return { error: error.message || 'An unknown error occurred', deleted: totalDeleted };
    }
}
