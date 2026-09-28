import { strings } from "@config/strings";
import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { createCanvas, drawAvatar, drawText, type TextStyle, toAttachment, wrapLines } from "@lib/canvas";
import { reply } from "@lib/discord";
import { containsProfanity } from "@lib/moderation";

const WIDTH = 700;
const PADDING = 28;
const BODY: TextStyle = { size: 26, colour: "#ffffff" };

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
		const lines = wrapLines(measuring, tweet, BODY, WIDTH - PADDING * 2);
		const height = 120 + lines.length * 36 + PADDING;

		const canvas = createCanvas(WIDTH, height);
		const draw = canvas.getContext("2d");

		draw.fillStyle = "#15202b";
		draw.fillRect(0, 0, WIDTH, height);

		await drawAvatar(draw, user.displayAvatarURL({ extension: "png", size: 128 }), PADDING, PADDING, 64);

		const nameX = PADDING + 84;
		drawText(draw, user.displayName, nameX, PADDING + 18, {
			size: 24,
			weight: 700,
			colour: "#ffffff",
			maxWidth: WIDTH - nameX - PADDING,
		});
		drawText(draw, `@${user.username}`, nameX, PADDING + 46, { size: 20, colour: "#8899a6" });
		lines.forEach((line, index) => {
			drawText(draw, line, PADDING, 129 + index * 36, BODY);
		});

		await reply(interaction, { files: [toAttachment(canvas, "tweet.png")] });
	},
});
