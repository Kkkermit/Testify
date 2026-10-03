import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { type AttachmentBuilder } from "discord.js";
import { repoRoot } from "@core/paths";
import { renderBoardImage } from "@lib/canvas/boardCard.util";
import { blackjackTable, hiloTable } from "@lib/canvas/cardTable.util";
import { diceStill } from "@lib/canvas/chanceArt.util";
import { renderMusicCard } from "@lib/canvas/musicCard.util";
import { renderRankCard } from "@lib/canvas/rankCard.util";
import { rouletteBoard } from "@lib/canvas/rouletteTable.util";
import { rouletteStill } from "@lib/canvas/rouletteWheel.util";
import { slotsStill } from "@lib/canvas/slotMachine.util";
import { renderWelcomeCard } from "@lib/canvas/welcomeCard.util";

/** Draws the images the README shows from the bot's own renderers, with invented people, so no real account appears. */

const OUT = resolve(repoRoot(), "docs/images/bot");

/** A soft two-colour gradient, standing in for a picture somebody uploaded. */
function gradient(width: number, height: number, from: string, to: string): Buffer {
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext("2d");
	const fill = ctx.createLinearGradient(0, 0, width, height);
	fill.addColorStop(0, from);
	fill.addColorStop(1, to);
	ctx.fillStyle = fill;
	ctx.fillRect(0, 0, width, height);
	ctx.globalAlpha = 0.18;
	ctx.fillStyle = "#ffffff";
	ctx.beginPath();
	ctx.arc(width * 0.7, height * 0.3, Math.min(width, height) * 0.35, 0, Math.PI * 2);
	ctx.fill();
	return canvas.toBuffer("image/png");
}

const avatar = (from: string, to: string): string =>
	`data:image/png;base64,${gradient(128, 128, from, to).toString("base64")}`;

const PEOPLE = [
	{ name: "Nova", avatar: avatar("#f472b6", "#7c3aed") },
	{ name: "Juniper", avatar: avatar("#34d399", "#0f766e") },
	{ name: "Atlas", avatar: avatar("#60a5fa", "#1e3a8a") },
	{ name: "Marigold", avatar: avatar("#fbbf24", "#c2410c") },
	{ name: "Pixel", avatar: "" },
	{ name: "Echo", avatar: avatar("#a78bfa", "#312e81") },
	{ name: "Saffron", avatar: "" },
	{ name: "Orbit", avatar: avatar("#22d3ee", "#155e75") },
	{ name: "Bramble", avatar: avatar("#86efac", "#166534") },
	{ name: "Quill", avatar: "" },
] as const;

function save(name: string, data: Buffer): void {
	writeFileSync(resolve(OUT, name), data);
	console.log(`  ${name}  ${(data.length / 1024).toFixed(0)} KB`);
}

const bytesOf = (attachment: AttachmentBuilder): Buffer => attachment.attachment as Buffer;

async function main(): Promise<void> {
	mkdirSync(OUT, { recursive: true });

	save(
		"rank-card.png",
		bytesOf(
			await renderRankCard({
				displayName: "Nova",
				avatarUrl: PEOPLE[0].avatar,
				level: 24,
				rank: 3,
				xp: 18_420,
				progress: 1_310,
				needed: 2_000,
				multiplier: 1.5,
			}),
		),
	);

	const balances = [482_150, 391_002, 260_775, 198_340, 150_900, 121_480, 96_215, 74_030, 51_600, 33_125];
	save(
		"leaderboard.png",
		bytesOf(
			await renderBoardImage({
				theme: "money",
				title: "Richest members",
				subtitle: "Testify HQ · Ranked by wallet and bank together",
				rows: PEOPLE.map((person, index) => ({
					rank: index + 1,
					displayName: person.name,
					avatarUrl: person.avatar,
					primary: (balances[index] ?? 0).toLocaleString("en-GB"),
					secondary: `${Math.round((balances[index] ?? 0) * 0.7).toLocaleString("en-GB")} banked`,
					you: index === 2,
				})),
				viewer: null,
				unranked: null,
				empty: "Nobody has an account here yet.",
				footer: "214 accounts ranked",
			}),
		),
	);

	save(
		"welcome-card.png",
		bytesOf(
			await renderWelcomeCard({
				displayName: "Juniper",
				avatarUrl: PEOPLE[1].avatar,
				serverName: "Testify HQ",
				memberCount: 1_284,
				background: gradient(1024, 450, "#1e1b4b", "#0f766e"),
			}),
		),
	);

	save(
		"now-playing.jpg",
		await renderMusicCard(
			{
				url: "https://www.youtube.com/watch?v=example",
				title: "Midnight City Lights",
				author: "The Example Ensemble",
				durationMs: 214_000,
				thumbnail: null,
				source: "youtube",
				requestedBy: "Atlas",
			},
			gradient(640, 640, "#f97316", "#7c3aed"),
		),
	);

	save("roulette-wheel.png", rouletteStill(17));
	save(
		"roulette-table.png",
		rouletteBoard({
			chips: [
				{ bet: { kind: "red" }, amount: 500, seat: 0 },
				{ bet: { kind: "number", number: 17 }, amount: 100, seat: 0 },
				{ bet: { kind: "dozen2" }, amount: 250, seat: 1 },
				{ bet: { kind: "odd" }, amount: 1_000, seat: 2 },
				{ bet: { kind: "number", number: 17 }, amount: 50, seat: 2 },
				{ bet: { kind: "column3" }, amount: 200, seat: 3 },
			],
			pocket: 17,
			history: [17, 32, 0, 5, 26, 11, 30],
		}),
	);

	save(
		"blackjack.png",
		blackjackTable({
			dealer: [
				{ rank: "K", suit: "spades" },
				{ rank: "7", suit: "hearts" },
			],
			player: [
				{ rank: "A", suit: "diamonds" },
				{ rank: "Q", suit: "clubs" },
			],
			hideHole: false,
			dealerTotal: "17",
			playerTotal: "21",
			banner: { text: "BLACKJACK · +750", tone: "win" },
		}),
	);

	save(
		"hilo.png",
		hiloTable({
			current: { rank: "9", suit: "hearts" },
			history: [
				{ rank: "4", suit: "clubs" },
				{ rank: "J", suit: "spades" },
				{ rank: "6", suit: "diamonds" },
			],
			multiplier: 2.34,
		}),
	);

	save("slots.png", slotsStill(["seven", "seven", "seven"]));
	save("dice.png", diceStill([6, 4]));
}

main().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
