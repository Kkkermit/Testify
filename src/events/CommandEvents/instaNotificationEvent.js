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

const logRateLimiter = {
    lastLogs: {},
    
    shouldLog: function(key, minutes = 30) {
        const now = Date.now();
        const lastLog = this.lastLogs[key] || 0;
        
        if (now - lastLog > minutes * 60 * 1000) {
            this.lastLogs[key] = now;
            return true;
        }
        return false;
    }
};

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchWithRetry(url, options, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                await delay(1000 * attempt);
            }
            
            if (attempt > 0) {
                options.headers['User-Agent'] = getRandomUserAgent();
            }
            
            return await fetch(url, options);
        } catch (error) {
            lastError = error;
            console.error(`${color.yellow}[${getTimestamp()}] [INSTA_NOTIFICATION] Fetch attempt ${attempt + 1} failed: ${error.message}${color.reset}`);
        }
    }
    
    throw lastError;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getLatestPost(username) {
    if (!rateLimiter.checkLimit(username)) {
        return null;
    }
    
    try {
        const headers = {
            'User-Agent': getRandomUserAgent(),
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'X-IG-App-ID': '936619743392459',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': `https://www.instagram.com/${username}/`,
            'Origin': 'https://www.instagram.com',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Dest': 'empty',
        };

        const encodedUsername = encodeURIComponent(username);
        const apiUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodedUsername}`;
        
        const userResponse = await fetchWithRetry(apiUrl, { headers });

        if (!userResponse.ok) {
            const statusCode = userResponse.status;
            if (logRateLimiter.shouldLog(`api_error_${username}_${statusCode}`, 30)) {
                console.error(`${color.yellow}[${getTimestamp()}] [INSTA_NOTIFICATION] Instagram API returned ${statusCode} for ${username}${color.reset}`);
                
                if (statusCode === 429) {
                    console.error(`${color.red}[${getTimestamp()}] [INSTA_NOTIFICATION] Rate limited by Instagram${color.reset}`);
                } else if (statusCode === 401 || statusCode === 403) {
                    console.error(`${color.red}[${getTimestamp()}] [INSTA_NOTIFICATION] Authentication error for Instagram API${color.reset}`);
                }
            }
            return null;
        }

        const contentType = userResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            if (logRateLimiter.shouldLog(`content_type_${username}`, 60)) {
                console.error(`${color.yellow}[${getTimestamp()}] [INSTA_NOTIFICATION] Warning: Invalid content type ${contentType} for ${username}${color.reset}`);
            }
            return null;
        }

        const userData = await userResponse.json();
        
        if (!userData?.data?.user) {
            if (logRateLimiter.shouldLog(`no_user_data_${username}`, 60)) {
                const errorDetails = userData?.status === 'fail' ? ` - Reason: ${userData.message}` : '';
                console.error(`${color.yellow}[${getTimestamp()}] [INSTA_NOTIFICATION] Warning: No user data found for ${username}${errorDetails}${color.reset}`);
            }
            return null;
        }

        const user = userData.data.user;

        if (!user.edge_owner_to_timeline_media?.edges?.length) {
            if (logRateLimiter.shouldLog(`no_posts_${username}`, 60)) {
                console.error(`${color.yellow}[${getTimestamp()}] [INSTA_NOTIFICATION] Warning: No posts found for ${username}${color.reset}`);
            }
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
            console.error(`${color.red}[${getTimestamp()}] [INSTA_NOTIFICATION] Error fetching Instagram posts for ${username}: ${error.message}${color.reset}`);
            rateLimiter.lastWarning[`error_${username}`] = now;
        }
        return null;
    }
}

module.exports = {
    name: Events.ClientReady,
    async execute(client) {
        let lastRoutineLog = 0;
        
        const checkInstagramPosts = async () => {
            try {
                const allGuilds = await InstagramSchema.find();
                const totalUsers = allGuilds.reduce((total, guild) => total + guild.InstagramUsers.length, 0);
                
                const now = Date.now();
                if (now - lastRoutineLog > 6 * 60 * 60 * 1000) {
                    lastRoutineLog = now;
                }

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
            } catch (error) {
                console.error(`${color.red}[${getTimestamp()}] [INSTA_NOTIFICATION] Error in post checking routine: ${color.reset}`, error);
            }
        };

        setInterval(checkInstagramPosts, 15 * 60 * 1000);

        setTimeout(() => {
            checkInstagramPosts();
        }, 60000); 
    }
};