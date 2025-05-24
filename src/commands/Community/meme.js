const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Parser = require('rss-parser');

module.exports = {
	usableInDms: true,
	category: "Community",
	data: new SlashCommandBuilder()
		.setName("meme")
		.setDescription("Get a random meme!"),
	async execute(interaction, client) {
		try {
			await interaction.deferReply();
			
			const parser = new Parser({
				customFields: {
					item: [
						['media:thumbnail', 'thumbnail'],
						['media:content', 'mediaContent']
					]
				}
			});
			
			const feed = await parser.parseURL('https://www.reddit.com/r/memes/hot.rss');
			
			if (!feed.items || feed.items.length === 0) {
				await interaction.editReply({ content: "Failed to fetch memes. Try again later!" });
				return;
			}
			
			const validMemes = feed.items.filter(item => {
				const content = item.content || item.contentSnippet || '';
				const hasRedditImage = content.includes('i.redd.it') || 
									 content.includes('preview.redd.it') ||
									 content.includes('i.imgur.com');
				const isNSFW = item.title.toLowerCase().includes('nsfw') ||
							  content.toLowerCase().includes('nsfw');
				
				return hasRedditImage && !isNSFW;
			});
			
			if (validMemes.length === 0) {
				await interaction.editReply({ content: "Couldn't find a good meme. Try again later!" });
				return;
			}
			
			const randomMeme = validMemes[Math.floor(Math.random() * validMemes.length)];
			
			let imageUrl = null;
			const content = randomMeme.content || randomMeme.contentSnippet || '';
			
			const redditImgMatch = content.match(/https?:\/\/i\.redd\.it\/[^\s"'<>]+/);
			const previewImgMatch = content.match(/https?:\/\/preview\.redd\.it\/[^\s"'<>]+/);
			const imgurMatch = content.match(/https?:\/\/i\.imgur\.com\/[^\s"'<>]+/);
			
			if (redditImgMatch) {
				imageUrl = redditImgMatch[0];
			} else if (previewImgMatch) {
				imageUrl = previewImgMatch[0];
			} else if (imgurMatch) {
				imageUrl = imgurMatch[0];
			}
			
			const embed = new EmbedBuilder()
				.setAuthor({ name: `Meme Command ${client.config.devBy}` })
				.setColor(client.config.embedCommunity)
				.setTitle(`${client.user.username} Meme Tool ${client.config.arrowEmoji}`)
				.setDescription(`**${randomMeme.title}**`)
				.setURL(randomMeme.link)
				.setFooter({ text: `From r/memes • ${new Date(randomMeme.pubDate).toLocaleDateString()}` })
				.setTimestamp(new Date(randomMeme.pubDate));
			
			if (imageUrl) {
				embed.setImage(imageUrl);
			}
			
			await interaction.editReply({ embeds: [embed] });
			
		} catch (error) {
			client.logs.error("[MEME_COMMAND] Error in meme command:", error.message);
			
			if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
				await interaction.editReply({ content: "Could not connect to Reddit. Check your internet connection." });
			} else if (error.message.includes('timeout')) {
				await interaction.editReply({ content: "Request timed out. Try again!" });
			} else {
				await interaction.editReply({ content: "There was an error getting the meme from Reddit. Try again later!" });
			}
		}
	},
};
