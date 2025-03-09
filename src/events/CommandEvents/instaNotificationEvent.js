const { Events, EmbedBuilder } = require('discord.js');
const InstagramSchema = require('../../schemas/instaNotificationSystem');
const { color, getTimestamp } = require('../../utils/loggingEffects');
const fetch = require('node-fetch');

const rateLimiter = {
    calls: {},
    lastWarning: {},
    
    checkLimit: function(username) {
        const now = Date.now();
        if (!this.calls[username]) {
            this.calls[username] = [];
        }

        this.calls[username] = this.calls[username].filter(time => now - time < 15 * 60 * 1000);
        if (this.calls[username].length >= 10) {
            const lastWarningTime = this.lastWarning[username] || 0;
            if (now - lastWarningTime > 30 * 60 * 1000) {
                console.warn(`${color.yellow}[${getTimestamp()}] [INSTA_NOTIFICATION] Rate limiting API calls for ${username}${color.reset}`);
                this.lastWarning[username] = now;
            }
            return false;
        }
        this.calls[username].push(now);
        return true;
    }
};

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getLatestPost(username) {
    if (!rateLimiter.checkLimit(username)) {
        return null;
    }
    
    try {
        const userResponse = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'X-IG-App-ID': '936619743392459',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': `https://www.instagram.com/${username}/`,
                'Cookie': 'ig_did=1; csrftoken=1; mid=1;'
            }
        });

        if (!userResponse.ok) {
            if (userResponse.status !== 429) {
                console.error(`${color.yellow}[${getTimestamp()}] [INSTA_NOTIFICATION] Warning: Instagram API returned ${userResponse.status} for ${username}${color.reset}`);
            }
            return null;
        }

        const contentType = userResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error(`${color.yellow}[${getTimestamp()}] [INSTA_NOTIFICATION] Warning: Invalid content type ${contentType} for ${username}${color.reset}`);
            return null;
        }

        const userData = await userResponse.json();
        
        if (!userData || !userData.data || !userData.data.user) {
            console.error(`${color.yellow}[${getTimestamp()}] [INSTA_NOTIFICATION] Warning: No user data found for ${username}${color.reset}`);
            return null;
        }

        const user = userData.data.user;

        if (!user.edge_owner_to_timeline_media?.edges?.length) {
            console.error(`${color.yellow}[${getTimestamp()}] [INSTA_NOTIFICATION] Warning: No posts found for ${username}${color.reset}`);
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
        const now = Date.now();
        const lastErrorTime = rateLimiter.lastWarning[`error_${username}`] || 0;
        if (now - lastErrorTime > 60 * 60 * 1000) { 
            console.error(`${color.red}[${getTimestamp()}] [INSTA_NOTIFICATION] Error fetching Instagram posts for ${username}: ${color.reset}`, error);
            rateLimiter.lastWarning[`error_${username}`] = now;
        }
        return null;
    }
}

module.exports = {
    name: Events.ClientReady,
    async execute(client) {
        const checkInstagramPosts = async () => {
            try {
                const allGuilds = await InstagramSchema.find();
                console.log(`${color.blue}[${getTimestamp()}] [INSTA_NOTIFICATION] Checking posts for ${allGuilds.reduce((total, guild) => total + guild.InstagramUsers.length, 0)} Instagram users${color.reset}`);

                for (const guildData of allGuilds) {
                    for (const username of guildData.InstagramUsers) {
                        await delay(3000); 
                        const latestPost = await getLatestPost(username);
                        
                        if (latestPost) {
                            const lastPostTime = new Date(latestPost.taken_at_timestamp * 1000);
                            const lastChecked = guildData.LastPostDates.get(username);

                            if (!lastChecked || lastPostTime > lastChecked) {
                                const channel = client.channels.cache.get(guildData.Channel);
                                if (channel) {

                                    const embed = new EmbedBuilder()
                                        .setAuthor({ name: `${client.user.username} Instagram Post Tracker`, iconURL: client.user.displayAvatarURL() })
                                        .setColor(client.config.embedInsta)
                                        .setTitle(`New Post from ${username}`)
                                        .setDescription(latestPost.caption || 'No caption')
                                        .setImage(latestPost.display_url)
                                        .setURL(`https://www.instagram.com/p/${latestPost.shortcode}`)
                                        .setTimestamp(lastPostTime)
                                        .setFooter({ text: 'Posted on Instagram' });

                                    await channel.send({ embeds: [embed] });

                                    guildData.LastPostDates.set(username, lastPostTime);
                                    await guildData.save();
                                }
                            }
                        }
                    }
                }
                
                console.log(`${color.green}[${getTimestamp()}] [INSTA_NOTIFICATION] Completed Instagram post check${color.reset}`);
            } catch (error) {
                console.error(`${color.red}[${getTimestamp()}] [INSTA_NOTIFICATION] Error in post checking routine: ${color.reset}`, error);
            }
        };

        setInterval(checkInstagramPosts, 15 * 60 * 1000);

        setTimeout(() => {
            console.log(`${color.blue}[${getTimestamp()}] [INSTA_NOTIFICATION] Starting initial Instagram post check${color.reset}`);
            checkInstagramPosts();
        }, 60000); 
    }
};