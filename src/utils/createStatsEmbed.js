const { EmbedBuilder } = require('discord.js');

function createStatsEmbed(items, type, user) {
    const embed = new EmbedBuilder()
        .setColor('#1DB954')
        .setAuthor({ name: `${user.username}'s Stats`, iconURL: user.displayAvatarURL() })
        .setTitle(`Top 10 ${type.charAt(0).toUpperCase() + type.slice(1)}`)
        .setTimestamp();

    let description = '';
    items.forEach((item, index) => {
        if (type === 'tracks') {
            description += `${index + 1}. ${item.name} - ${item.artists[0].name}\n`;
        } else if (type === 'artists') {
            description += `${index + 1}. ${item.name}\n`;
        } else if (type === 'albums') {
            description += `${index + 1}. ${item.name} - ${item.artists[0].name}\n`;
        }
    });

    embed.setDescription(description);
    return embed;
}

module.exports = { createStatsEmbed };