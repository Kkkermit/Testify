const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
	data: new SlashCommandBuilder().setName("meme").setDescription("Get a random meme!"),
	async execute(interaction, client) {
		try {
			const response = await axios.get("https://www.reddit.com/r/memes/random.json");

			if (response.data && response.data[0] && response.data[0].data.children[0].data) {
				const memeData = response.data[0].data.children[0].data;
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

				await interaction.reply({ embeds: [embed] });
			} else {
				await interaction.reply({ content: "Failed to fetch a meme. Try again later.", ephemeral: true });
			}
		} catch (error) {
			await interaction.reply({ content: "There was an error getting the meme from axios!", ephemeral: true });
		}
	},
};
