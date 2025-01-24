const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'clear',
    aliases : ['purge'],
    async execute(message, client, args) {
        
        const amount = args[0];
        const user = message.guild.members.cache.get(args[1]) || message.mentions.members.first() 

        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return await message.channel.send({ content: `${client.config.noPerms}`, ephemeral: true});
        if (isNaN(amount) || parseInt(amount) < 1 || parseInt(amount) > 99) return message.channel.send({ content: 'Please provide a valid number between 1 and 99.', ephemeral: true});
        if (!amount) return message.channel.send({ content: 'Please provide the amount of message you want to clear.', ephemeral: true});

        let messages;
        if (user) {
            messages = await message.channel.messages.fetch({ limit: parseInt(amount) + 1 })
                .then(messages => messages.filter(m => m.author.id === user.id && m.id !== message.id))
                .then(messages => messages.first(parseInt(amount)));
        } else {
            messages = await message.channel.messages.fetch({ limit: parseInt(amount) + 1 })
                .then(messages => messages.filter(m => m.id !== message.id));
        }

        const deletedMessages = await message.channel.bulkDelete(messages, true);
        const deletedSize = deletedMessages.size;
        const deletedUser = user ? user.username : 'everyone';

        const clearEmbed = new EmbedBuilder()
        .setAuthor({ name: `${client.user.username} purge command ${client.config.devBy}`})
        .setColor(client.config.embedModLight)
        .setTitle(`Purge command used in ${message.channel} ${client.config.arrowEmoji}`)
        .setDescription(`> Successfully deleted **${deletedSize}** messages sent by **${deletedUser}**.`)
        .setThumbnail(client.user.avatarURL())
        .setFooter({ text: `Purge command`})
        .setTimestamp()

        return message.channel.send({ embeds: [clearEmbed], ephemeral: true });

    }
}