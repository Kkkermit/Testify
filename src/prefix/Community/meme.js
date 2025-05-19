const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    name: 'meme',
    usableInDms: true,
    description: 'Get a random meme from Reddit',
    usage: 'meme',
    category: 'Community',
    async execute(message, client) {
        const loadingMsg = await message.channel.send("Fetching a meme...");
        
        try {
            const headers = {
                'User-Agent': `DiscordBot/${client.user.username || 'Bot'} (Node.js/${process.version})`,
                'Accept': 'application/json'
            };
            
            const response = await axios.get("https://www.reddit.com/r/memes/hot.json?limit=100", { headers });
            
            if (response.data && response.data.data && Array.isArray(response.data.data.children) && response.data.data.children.length > 0) {
                const randomIndex = Math.floor(Math.random() * response.data.data.children.length);
                let memeData = response.data.data.children[randomIndex].data;
                
                if (memeData.stickied || !memeData.url || memeData.is_self || memeData.over_18) {
                    const newIndex = (randomIndex + 1) % response.data.data.children.length;
                    const newMemeData = response.data.data.children[newIndex].data;
                    
                    if (newMemeData.stickied || !newMemeData.url || newMemeData.is_self || newMemeData.over_18) {
                        await loadingMsg.edit("Couldn't find a good meme. Try again later!");
                        return;
                    }
                    
                    memeData = newMemeData;
                }

                const { url, title, ups, num_comments } = memeData;
        
                const embed = new EmbedBuilder()
                .setAuthor({ name: `Meme Command ${client.config.devBy}` })
                .setColor(client.config.embedCommunity)
                .setTitle(`${client.user.username} Meme Tool ${client.config.arrowEmoji}`)
                .setDescription(`**${title}**`)
                .setURL(`https://www.reddit.com${memeData.permalink}`)
                .setImage(url)
                .setFooter({ text: `👍 ${ups}  |  💬 ${num_comments || 0}` })
                .setTimestamp();
        
                await loadingMsg.edit({ content: null, embeds: [embed] });
            } else {
                client.logs.error("[MEME_COMMAND] Invalid response structure from Reddit API:", response.data);
                await loadingMsg.edit("Failed to fetch a meme. Try again later.");
            }
        } catch (error) {
            client.logs.error("[MEME_COMMAND] Error in meme prefix command:", error.message);
            if (error.response && error.response.status) {
                client.logs.error(`[MEME_COMMAND] Status code: ${error.response.status}, Response data:`, error.response.data);
            }
            await loadingMsg.edit("There was an error getting the meme from Reddit. Try again later!");
        }
    },
}