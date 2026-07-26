import { type AttachmentBuilder, type GuildMember } from "discord.js";
import { createCanvas, drawAvatar, fitFont, toAttachment } from "../../../ui/canvas";
import { formatNumber } from "../../../ui/format";

const WIDTH = 900;
const HEIGHT = 300;

/**
 * The original welcome card never rendered: its handler declared the wrong
 * signature so the first guard always returned, and it called `canvas.context`,
 * which does not exist.
 */
export async function renderWelcomeCard(member: GuildMember): Promise<AttachmentBuilder> {
	const canvas = createCanvas(WIDTH, HEIGHT);
	const draw = canvas.getContext("2d");

	const gradient = draw.createLinearGradient(0, 0, WIDTH, HEIGHT);
	gradient.addColorStop(0, "#1e1f22");
	gradient.addColorStop(1, "#2b2d31");
	draw.fillStyle = gradient;
	draw.fillRect(0, 0, WIDTH, HEIGHT);

	draw.strokeStyle = "#5865f2";
	draw.lineWidth = 6;
	draw.strokeRect(3, 3, WIDTH - 6, HEIGHT - 6);

	const avatarSize = 160;
	const avatarX = 60;
	const avatarY = (HEIGHT - avatarSize) / 2;

	draw.beginPath();
	draw.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 6, 0, Math.PI * 2);
	draw.fillStyle = "#5865f2";
	draw.fill();

	await drawAvatar(draw, member.user.displayAvatarURL({ extension: "png", size: 256 }), avatarX, avatarY, avatarSize);

	const textX = avatarX + avatarSize + 50;
	draw.textBaseline = "middle";
	draw.textAlign = "left";

	draw.fillStyle = "#b5bac1";
	draw.font = "28px sans-serif";
	draw.fillText("WELCOME", textX, 90);

	draw.fillStyle = "#ffffff";
	fitFont(draw, member.displayName, WIDTH - textX - 50, 52, "sans-serif");
	draw.fillText(member.displayName, textX, 148);

	draw.fillStyle = "#b5bac1";
	draw.font = "26px sans-serif";
	draw.fillText(`Member #${formatNumber(member.guild.memberCount)}`, textX, 200);

	return toAttachment(canvas, "welcome.png");
}
