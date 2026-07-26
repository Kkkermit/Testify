import { Category } from "../../../config/categories";
import { strings } from "../../../config/strings";
import { defineCommand } from "../../../core/command";
import { containsProfanity } from "../../../core/contentFilter";
import { UserFacingError } from "../../../core/errors";
import { createCanvas, drawAvatar, toAttachment, wrapText } from "../../../ui/canvas";

const WIDTH = 700;
const PADDING = 28;

export default defineCommand({
	name: "fake-tweet",
	description: "Renders a fake tweet from a user.",
	category: Category.Fun,
	surfaces: ["slash", "prefix"],
	guildOnly: true,
	cooldownMs: 8_000,
	options: [
		{ name: "user", description: "Who is 'tweeting'.", type: "user" },
		{ name: "tweet", description: "What they said.", type: "string", required: true, maxLength: 240, greedy: true },
	],

	async execute(ctx) {
		const tweet = ctx.options.getString("tweet", true).trim();
		if (containsProfanity(tweet)) throw new UserFacingError(strings.generic.profanity);

		const user = ctx.options.getUser("user") ?? ctx.user;
		await ctx.defer();

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

		await ctx.reply({ files: [toAttachment(canvas, "tweet.png")] });
	},
});
