import { strings } from "@config/strings";
import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { createCanvas, drawAvatar, toAttachment, wrapText } from "@lib/canvas";
import { containsProfanity } from "@lib/contentFilter";
import { reply } from "@lib/reply";

const WIDTH = 700;
const PADDING = 28;

export default defineCommand({
	name: "fake-tweet",
	description: "Renders a fake tweet from a user.",
	category: "fun",
	guildOnly: true,
	cooldown: 8_000,
	options: [
		{ name: "tweet", description: "What they said.", type: "string", required: true, maxLength: 240 },
		{ name: "user", description: "Who is 'tweeting'.", type: "user" },
	],

	async run(interaction) {
		const tweet = interaction.options.getString("tweet", true).trim();
		if (containsProfanity(tweet)) throw new UserFacingError(strings.generic.profanity);

		const user = interaction.options.getUser("user") ?? interaction.user;
		await interaction.deferReply();

		const measuring = createCanvas(WIDTH, 10).getContext("2d");
		measuring.font = "26px sans-serif";
		const lines = wrapText(measuring, tweet, WIDTH - PADDING * 2);
		const height = 120 + lines.length * 36 + PADDING;

		const canvas = createCanvas(WIDTH, height);
		const draw = canvas.getContext("2d");

		draw.fillStyle = "#15202b";
		draw.fillRect(0, 0, WIDTH, height);

		await drawAvatar(draw, user.displayAvatarURL({ extension: "png", size: 128 }), PADDING, PADDING, 64);

		draw.fillStyle = "#ffffff";
		draw.font = "bold 24px sans-serif";
		draw.textBaseline = "top";
		draw.fillText(user.displayName, PADDING + 84, PADDING + 6);

		draw.fillStyle = "#8899a6";
		draw.font = "20px sans-serif";
		draw.fillText(`@${user.username}`, PADDING + 84, PADDING + 36);

		draw.fillStyle = "#ffffff";
		draw.font = "26px sans-serif";
		lines.forEach((line, index) => {
			draw.fillText(line, PADDING, 116 + index * 36);
		});

		await reply(interaction, { files: [toAttachment(canvas, "tweet.png")] });
	},
});
