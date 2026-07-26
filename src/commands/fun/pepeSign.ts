import { strings } from "../../config/strings";
import { defineCommand } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { createCanvas, fitFont, roundedRect, toAttachment, wrapText } from "../../lib/canvas";
import { containsProfanity } from "../../lib/contentFilter";
import { reply } from "../../lib/reply";

const WIDTH = 420;
const HEIGHT = 320;

export default defineCommand({
	name: "pepe-sign",
	description: "Puts your text on a hand-held sign.",
	category: "fun",
	cooldown: 5_000,
	options: [
		{
			name: "text",
			description: "The text for the sign.",
			type: "string",
			required: true,
			maxLength: 80,
		},
	],

	async run(interaction) {
		const text = interaction.options.getString("text", true).trim();
		if (containsProfanity(text)) throw new UserFacingError(strings.generic.profanity);

		const canvas = createCanvas(WIDTH, HEIGHT);
		const draw = canvas.getContext("2d");

		draw.fillStyle = "#2b2d31";
		draw.fillRect(0, 0, WIDTH, HEIGHT);

		draw.fillStyle = "#8b5a2b";
		draw.fillRect(WIDTH / 2 - 12, 190, 24, HEIGHT - 190);

		draw.fillStyle = "#f4e4c1";
		roundedRect(draw, 40, 40, WIDTH - 80, 160, 12);
		draw.fill();
		draw.lineWidth = 6;
		draw.strokeStyle = "#8b5a2b";
		draw.stroke();

		draw.fillStyle = "#1a1a1a";
		draw.textAlign = "center";
		draw.textBaseline = "middle";

		const size = fitFont(draw, text, WIDTH - 120, 34, "sans-serif");
		const lines = wrapText(draw, text, WIDTH - 120).slice(0, 4);
		const lineHeight = size + 6;
		const startY = 120 - ((lines.length - 1) * lineHeight) / 2;

		lines.forEach((line, index) => {
			draw.fillText(line, WIDTH / 2, startY + index * lineHeight);
		});

		await reply(interaction, { files: [toAttachment(canvas, "sign.png")] });
	},
});
