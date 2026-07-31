import { AttachmentBuilder } from "discord.js";
import { boardHeight, medalColour, renderBoardImage } from "@lib/boardCard.util";
import { barFill, type RankCardData, rankCardText, renderRankCard } from "@lib/rankCard.util";

/** The avatar fetch is deliberately pointed at a closed local port. */
const UNREACHABLE = "http://127.0.0.1:1/avatar.png";

function card(overrides: Partial<RankCardData> = {}): RankCardData {
	return {
		displayName: "Someone",
		avatarUrl: UNREACHABLE,
		level: 4,
		rank: 2,
		xp: 1_800,
		progress: 200,
		needed: 900,
		...overrides,
	};
}

describe("rankCardText", () => {
	it("labels the level, rank and XP", () => {
		expect(rankCardText(card())).toEqual({
			name: "Someone",
			level: "LEVEL 4",
			rank: "RANK 2nd",
			xp: "200 / 900 XP",
			badge: null,
		});
	});

	it("says unranked rather than showing a place nobody holds", () => {
		expect(rankCardText(card({ rank: null })).rank).toBe("UNRANKED");
	});

	it("formats large numbers with separators", () => {
		expect(rankCardText(card({ progress: 12_345, needed: 90_000 })).xp).toBe("12,345 / 90,000 XP");
	});

	it("shows a boost badge only when the member actually has one", () => {
		expect(rankCardText(card({ multiplier: 1 })).badge).toBeNull();
		expect(rankCardText(card({ multiplier: 3 })).badge).toBe("×3 XP");
	});
});

describe("barFill", () => {
	it("fills nothing at the start of a level", () => {
		expect(barFill(0, 900, 600)).toBe(0);
	});

	it("fills half way", () => {
		expect(barFill(450, 900, 600)).toBe(300);
	});

	/** An admin setting a level by hand can leave XP outside its own range. */
	it("never draws wider than the track", () => {
		expect(barFill(5_000, 900, 600)).toBe(600);
	});

	it("never draws a negative width", () => {
		expect(barFill(-50, 900, 600)).toBe(0);
	});

	/** Dividing by a zero-width level would be NaN, and NaN reaches the canvas. */
	it("treats a level that costs nothing as complete", () => {
		expect(barFill(0, 0, 600)).toBe(600);
	});
});

describe("renderRankCard", () => {
	it("renders a PNG even when the avatar cannot be fetched", async () => {
		const attachment = await renderRankCard(card());

		expect(attachment).toBeInstanceOf(AttachmentBuilder);
		expect(attachment.name).toBe("rank.png");
	});

	it("renders for a member with no rank and a boost", async () => {
		const attachment = await renderRankCard(card({ rank: null, multiplier: 5, progress: 0 }));
		expect(attachment.name).toBe("rank.png");
	});

	/** A long name has to shrink rather than run off the card. */
	it("renders a very long display name", async () => {
		const attachment = await renderRankCard(card({ displayName: "A".repeat(120) }));
		expect(attachment.name).toBe("rank.png");
	});
});

describe("boardHeight", () => {
	it("grows with the number of rows", () => {
		expect(boardHeight(10)).toBeGreaterThan(boardHeight(3));
	});

	/** An empty board still needs somewhere to put "nobody is here yet". */
	it("leaves room for one row when there are none", () => {
		expect(boardHeight(0)).toBe(boardHeight(1));
	});
});

describe("medalColour", () => {
	it("colours the top three differently from each other", () => {
		const top = [medalColour(0), medalColour(1), medalColour(2)];
		expect(new Set(top).size).toBe(3);
	});

	it("gives everyone below third the same colour", () => {
		expect(medalColour(3)).toBe(medalColour(9));
	});
});

describe("renderBoardImage", () => {
	const rows = Array.from({ length: 10 }, (_, index) => ({
		rank: index + 1,
		displayName: `Member ${index + 1}`,
		avatarUrl: UNREACHABLE,
		primary: `Level ${20 - index}`,
		secondary: `${1_000 - index} XP`,
	}));

	it("renders a full page", async () => {
		const attachment = await renderBoardImage("Top levels", rows);

		expect(attachment).toBeInstanceOf(AttachmentBuilder);
		expect(attachment.name).toBe("leaderboard.png");
	});

	it("renders an empty board without failing", async () => {
		const attachment = await renderBoardImage("Top levels", [], "Nobody yet.");
		expect(attachment.name).toBe("leaderboard.png");
	});

	it("renders a single row", async () => {
		const attachment = await renderBoardImage("Top levels", rows.slice(0, 1));
		expect(attachment.name).toBe("leaderboard.png");
	});
});
