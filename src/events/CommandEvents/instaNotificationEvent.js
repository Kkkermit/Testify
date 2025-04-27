const { Events, EmbedBuilder } = require('discord.js');
const InstagramSchema = require('../../schemas/instaNotificationSystem');
const instagramApi = require('../../api/instagramApi');
const { color, getTimestamp } = require('../../utils/loggingEffects');

module.exports = {
    name: Events.ClientReady,
    async execute(client) {
        let lastRoutineLog = 0;
        
        const checkInstagramPosts = async () => {
            try {
                const allGuilds = await InstagramSchema.find();
                
                const now = Date.now();
                if (now - lastRoutineLog > 6 * 60 * 60 * 1000) {
                    lastRoutineLog = now;
                }

                for (const guildData of allGuilds) {
                    for (const username of guildData.InstagramUsers) {
                        await instagramApi.delay(3000); 
                        const latestPost = await instagramApi.getLatestPost(username);
                        
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