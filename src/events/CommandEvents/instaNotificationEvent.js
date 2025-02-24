const { Events } = require('discord.js');
const InstagramSchema = require('../../schemas/instaNotificationSystem');
const { color, getTimestamp } = require('../../utils/loggingEffects');
const fetch = require('node-fetch');

async function getLatestPost(username) {
    try {
        const userResponse = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'X-IG-App-ID': '936619743392459' 
            }
        });

        const userData = await userResponse.json();
        const user = userData.data.user;

        if (!user || !user.edge_owner_to_timeline_media || !user.edge_owner_to_timeline_media.edges.length) {
            return null;
        }

        const latestPost = user.edge_owner_to_timeline_media.edges[0].node;
        return {
            taken_at_timestamp: latestPost.taken_at_timestamp,
            caption: latestPost.edge_media_to_caption?.edges[0]?.node?.text || 'No caption was provided',
            display_url: latestPost.display_url,
            shortcode: latestPost.shortcode
        };
    } catch (error) {
        console.error(`${color.red}[${getTimestamp()}] [INSTA_NOTIFICATION] Error fetching Instagram posts for ${username}: ${color.reset}`, error);
        return null;
    }
}

module.exports = {
    name: Events.ClientReady,
    async execute(client) {
        const checkInstagramPosts = async () => {
            const allGuilds = await InstagramSchema.find();

            for (const guildData of allGuilds) {
                for (const username of guildData.InstagramUsers) {
                    const latestPost = await getLatestPost(username);
                    
                    if (latestPost) {
                        const lastPostTime = new Date(latestPost.taken_at_timestamp * 1000);
                        const lastChecked = guildData.LastPostDates.get(username);

                        if (!lastChecked || lastPostTime > lastChecked) {
                            const channel = client.channels.cache.get(guildData.Channel);
                            if (channel) {
                                await channel.send({
                                    embeds: [{
                                        author: { name: `${client.user.username} Instagram Post Tracker`, iconURL: client.user.displayAvatarURL() },
                                        color: 'LuminousVividPink',
                                        title: `New Post from ${username}`,
                                        description: latestPost.caption || 'No caption',
                                        image: { url: latestPost.display_url },
                                        url: `https://www.instagram.com/p/${latestPost.shortcode}`,
                                        timestamp: lastPostTime,
                                        footer: { text: `Posted on Instagram` }
                                    }]
                                });

                                guildData.LastPostDates.set(username, lastPostTime);
                                await guildData.save();
                            }
                        }
                    }
                }
            }
        };

        setInterval(checkInstagramPosts, 5 * 60 * 1000);
        checkInstagramPosts();
    }
};