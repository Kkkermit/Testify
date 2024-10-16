const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const axios = require("axios");
module.exports = {
	data: new SlashCommandBuilder()
	.setName("ytmp3")
	.setDescription("Download MP3 versions of YT videos")
	.addStringOption(option => option.setName("video-id").setDescription("The ID of your video").setRequired(true)),
	async execute(interaction, client) {
		
		await interaction.deferReply({ ephemeral: true });

		const { options } = interaction;
		const vidId = options.getString("video-id");

		const apiKey = process.env.rapidapikey;
		if (!apiKey) { 
			client.logs.error("[COMMAND_ERROR] No API key has been provided for Rapid API! Double check your .env file and make sure it is correct. If your unsure where to get this, please refer to the post installation guide by running 'npm run postinstall'."); 
			return
		}

		const input = {
			method: "GET",
			url: "https://youtube-mp3-download1.p.rapidapi.com/dl",
			params: { id: vidId },
			headers: {
				"X-RapidAPI-Key": `${apiKey}`,
				"X-RapidAPI-Host": "youtube-mp3-download1.p.rapidapi.com",
			},
		};

		try {
			const response = await axios.request(input);
			const button = new ActionRowBuilder().addComponents(
				new ButtonBuilder().setLabel("📬 Download MP3").setStyle(ButtonStyle.Link).setURL(response.data.link),
			);
			const embed = new EmbedBuilder()
				.setColor(client.config.embedCommunity)
				.setAuthor({ name: `Youtube MP3 Command ${client.config.devBy}` })
				.setThumbnail(client.user.avatarURL())
				.setTitle(`${client.user.username} Youtube MP3 Tool ${client.config.arrowEmoji}`)
				.setURL(response.data.link)
				.setTimestamp()
				.setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
				.setDescription(`> Click below to get your MP3 version of \`${response.data.title}\``);

			await interaction.editReply({ embeds: [embed], components: [button] });
		} catch (err) {
			console.log(err);
			await interaction.editReply({content: "That video ID **does not** exist! Go to the youtube link, and copy the **ID** after the \`\`=\`\` sign or the \`\`/\`\`"});
		}
	},
};
