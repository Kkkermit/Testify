const { Events, EmbedBuilder, ButtonStyle, ButtonBuilder, ActionRowBuilder } = require("discord.js");
const config = require('../config');

module.exports = {
    name: Events.MessageCreate,
    
    async execute(message, client, interaction) {
        if (message.author.bot) return;
        if (message.content.includes('?bon'))  {
        
        const args = message.content.split(' ');
        const user = message.mentions.users.first() || client.users.cache.get(args[1]);
        const reason = args.slice(2).join(' ') || '\`\`Reason for ban not given\`\`';
        
        if (!user) return message.reply({ content: 'Please mention a user to bon.', ephemeral: true });
        
        const bonEmbed = new EmbedBuilder()
        .setAuthor({ name: `${client.user.username} bon command`})
        .setTitle(`> ${config.modEmojiHard}  Bon command ${config.arrowEmoji}`)
        .setColor(config.embedModHard)
        .addFields({ name: 'User', value: `> ${user.tag}`, inline: true })
        .addFields({ name: 'Reason', value: `> ${reason}`, inline: true })
        .setFooter({ text: `Someone got got struck by the bon hammer` })
        .setThumbnail(client.user.avatarURL())
        .setTimestamp()
        
        return message.reply({ embeds: [bonEmbed]});
        
        }
    },
}