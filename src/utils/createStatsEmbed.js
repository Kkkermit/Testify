const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Canvas = require('@napi-rs/canvas');
const config = require('../config');

async function createCollage(items, type) {
    if (!items || items.length < 4) return null;

    const canvas = Canvas.createCanvas(800, 800);
    const ctx = canvas.getContext('2d');
    
    const images = await Promise.all(
        items.slice(0, 4).map(async (item) => {
            let imageUrl;
            switch(type) {
                case 'tracks':
                    imageUrl = item.album?.images[0]?.url;
                    break;
                case 'artists':
                    imageUrl = item.images?.[0]?.url;
                    break;
                case 'albums':
                    imageUrl = item.images?.[0]?.url;
                    break;
            }
            if (!imageUrl) return null;
            
            const img = await Canvas.loadImage(imageUrl);
            return img;
        })
    );

    const size = 400;
    images.forEach((img, i) => {
        if (img) {
            const x = (i % 2) * size;
            const y = Math.floor(i / 2) * size;
            ctx.drawImage(img, x, y, size, size);
        }
    });

    return canvas;
}

async function createStatsEmbed(items, type, user, timeRange = 'long_term') {
    const embed = new EmbedBuilder()
        .setColor(config.embedSpotify)
        .setAuthor({ name: `${user.username}'s Spotify Stats`, iconURL: user.displayAvatarURL() })
        .setTitle(`Top 10 ${type.charAt(0).toUpperCase() + type.slice(1)}`)
        .setDescription('Loading...')
        .setFooter({ text: `Time Range: ${timeRange.replace('_', ' ').replace('term', 'Term')} ${config.devBy}` })
        .setTimestamp()
        .setThumbnail('https://i.postimg.cc/cLs5Yytb/spotify.webp')

    if (!items || items.length === 0) {
        embed.setDescription('No data available.');
        return { embed };
    }

    let description = '';
    items.forEach((item, index) => {
        if (!item) return;
        
        switch(type) {
            case 'tracks':
                description += `${index + 1}. ${item.name} - ${item.artists[0].name}\n`;
                break;
            case 'artists':
                description += `${index + 1}. ${item.name}\n`;
                break;
            case 'albums':
                description += `${index + 1}. ${item.name} - ${item.artists[0].name}\n`;
                break;
        }
    });

    embed.setDescription(description || 'No items to display.');

    if (items.length >= 4) {
        const collage = await createCollage(items, type);
        if (collage) {
            const attachment = new AttachmentBuilder(await collage.encode('png'), { name: 'collage.png' });
            embed.setImage('attachment://collage.png');
            return { embed, attachment };
        }
    }

    return { embed };
}

module.exports = { createStatsEmbed };