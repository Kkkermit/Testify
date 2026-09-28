import { strings } from "@config/strings";
import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { createCanvas, drawText, roundedRect, type TextStyle, toAttachment, wrapLines } from "@lib/canvas";
import { reply } from "@lib/discord";
import { containsProfanity } from "@lib/moderation";

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

		// Shrink before wrapping past three lines, and never below a size that reads at a glance.
		const room = WIDTH - 120;
		let style: TextStyle = { size: 34, weight: 700, colour: "#1a1a1a" };
		while (wrapLines(draw, text, style, room).length > 3 && style.size > 20) style = { ...style, size: style.size - 2 };
		const lines = wrapLines(draw, text, style, room, 3);
		const lineHeight = style.size + 6;
		const startY = 120 - ((lines.length - 1) * lineHeight) / 2;

		lines.forEach((line, index) => {
			drawText(draw, line, WIDTH / 2, startY + index * lineHeight, { ...style, align: "center" });
		});

		await reply(interaction, { files: [toAttachment(canvas, "sign.png")] });
	},
});
