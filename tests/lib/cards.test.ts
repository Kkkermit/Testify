import { AttachmentBuilder } from "discord.js";
import { boardLayout, medalColour, placeholderColour, renderBoardImage } from "@lib/canvas/boardCard.util";
import { type BoardCard } from "@lib/canvas/canvas.types";
import { barFill, type RankCardData, rankCardText, renderRankCard } from "@lib/canvas/rankCard.util";

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

describe("boardLayout", () => {
	const rows = (count: number) => Array.from({ length: count }, () => ({}) as BoardCard["rows"][number]);

	it("grows with the number of rows", () => {
		expect(boardLayout({ rows: rows(10), viewer: null, unranked: null }).height).toBeGreaterThan(
			boardLayout({ rows: rows(3), viewer: null, unranked: null }).height,
		);
	});

	/** An empty board still needs somewhere to put "nobody is here yet". */
	it("leaves room for one row when there are none", () => {
		expect(boardLayout({ rows: [], viewer: null, unranked: null }).height).toBe(
			boardLayout({ rows: rows(1), viewer: null, unranked: null }).height,
		);
	});

	it("makes room under the rows only for the reader's own row or note", () => {
		const plain = boardLayout({ rows: rows(10), viewer: null, unranked: null });
		const withViewer = boardLayout({ rows: rows(10), viewer: rows(1)[0]!, unranked: null });
		const unranked = boardLayout({ rows: rows(10), viewer: null, unranked: "Not yet" });

		expect(plain.viewer).toBeNull();
		expect(withViewer.viewer).toBeGreaterThan(withViewer.rows.at(-1)!);
		expect(unranked.height).toBe(withViewer.height);
		expect(withViewer.footer).toBeGreaterThan(withViewer.viewer!);
	});
});

describe("medalColour", () => {
	it("colours the top three differently from each other", () => {
		const top = [medalColour(0), medalColour(1), medalColour(2)];
		expect(new Set(top).size).toBe(3);
	});

	it("gives nobody below third a medal", () => {
		expect(medalColour(3)).toBeNull();
	});
});

describe("placeholderColour", () => {
	/** A person without an avatar should look the same on every board, not change colour between draws. */
	it("gives a name the same colour every time, and different names different colours", () => {
		expect(placeholderColour("Kkermit")).toBe(placeholderColour("Kkermit"));
		expect(new Set(["Mia", "Oliver", "Noah", "Ava", "Zoe"].map(placeholderColour)).size).toBeGreaterThan(1);
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

	const board = (overrides: Partial<BoardCard> = {}): BoardCard => ({
		theme: "levels",
		title: "Top levels",
		subtitle: "Testify HQ · Ranked by level",
		rows,
		viewer: null,
		unranked: null,
		empty: "Nobody yet.",
		footer: "10 members ranked",
		...overrides,
	});

	it("renders the top ten with the reader's own row under it", async () => {
		const attachment = await renderBoardImage(
			board({ viewer: { ...rows[0]!, rank: 27, displayName: "Kkermit ツ 🎉", you: true } }),
		);

		expect(attachment).toBeInstanceOf(AttachmentBuilder);
		expect(attachment.name).toBe("leaderboard.png");
	});

	it("renders an empty money board without failing", async () => {
		const attachment = await renderBoardImage(board({ theme: "money", rows: [], unranked: "Not yet." }));
		expect(attachment.name).toBe("leaderboard.png");
	});
});
