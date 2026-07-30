import { AttachmentBuilder } from "discord.js";
import { coverRect, renderWelcomeCard, type WelcomeCardData, welcomeCardText } from "@lib/welcomeCard.util";

/**
 * Rendered for real through `@napi-rs/canvas` rather than against a mocked
 * context. The original card never produced an image at all — its handler took
 * its parameters in the wrong order and it called `canvas.context`, which does
 * not exist — so "does it actually come out as a PNG" is the thing worth testing.
 *
 * The avatar URL points at a closed local port, so nothing here touches the
 * network and the lettered-circle fallback is exercised on every case.
 */
const UNREACHABLE = "http://127.0.0.1:1/avatar.png";

function card(overrides: Partial<WelcomeCardData> = {}): WelcomeCardData {
	return {
		displayName: "alice",
		avatarUrl: UNREACHABLE,
		serverName: "Test Server",
		memberCount: 1_234,
		...overrides,
	};
}

describe("welcomeCardText", () => {
	it("shouts the server name and counts the member in", () => {
		expect(welcomeCardText(card())).toEqual({
			heading: "WELCOME TO TEST SERVER",
			name: "alice",
			position: "Member #1,234",
		});
	});

	it("separates the thousands, so a big count stays readable", () => {
		expect(welcomeCardText(card({ memberCount: 1_000_000 })).position).toBe("Member #1,000,000");
	});

	it("counts the very first member in", () => {
		expect(welcomeCardText(card({ memberCount: 1 })).position).toBe("Member #1");
	});
});

describe("coverRect", () => {
	const target = { width: 1_024, height: 400 };

	/** The same maths as CSS object-fit: cover — fill the card, crop the overflow. */
	it("fills exactly when the aspect ratio already matches", () => {
		expect(coverRect({ width: 2_048, height: 800 }, target)).toEqual({ x: 0, y: 0, width: 1_024, height: 400 });
	});

	it("crops the sides of an image that is too wide", () => {
		const rect = coverRect({ width: 4_000, height: 400 }, target);

		expect(rect.height).toBe(400);
		expect(rect.width).toBeGreaterThan(target.width);
		expect(rect.x).toBeLessThan(0);
		expect(rect.y).toBe(0);
	});

	it("crops the top and bottom of an image that is too tall", () => {
		const rect = coverRect({ width: 1_024, height: 4_000 }, target);

		expect(rect.width).toBe(1_024);
		expect(rect.height).toBeGreaterThan(target.height);
		expect(rect.y).toBeLessThan(0);
	});

	/** Never stretches: both axes scale by the same factor. */
	it("keeps the aspect ratio", () => {
		const rect = coverRect({ width: 300, height: 900 }, target);
		expect(rect.width / rect.height).toBeCloseTo(300 / 900, 5);
	});

	it("falls back to the target rather than dividing by zero", () => {
		expect(coverRect({ width: 0, height: 0 }, target)).toEqual({ x: 0, y: 0, ...target });
	});
});

describe("renderWelcomeCard", () => {
	it("produces a Discord attachment", async () => {
		await expect(renderWelcomeCard(card())).resolves.toBeInstanceOf(AttachmentBuilder);
	});

	it("produces a real PNG, not an empty buffer", async () => {
		const attachment = await renderWelcomeCard(card());
		const data = attachment.attachment as Buffer;

		expect(Buffer.isBuffer(data)).toBe(true);
		expect(data.length).toBeGreaterThan(1_000);
		// PNG magic number.
		expect([...data.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
	});

	it("renders a very long display name without throwing", async () => {
		await expect(renderWelcomeCard(card({ displayName: "a".repeat(300) }))).resolves.toBeDefined();
	});

	it("renders an empty-ish display name without throwing", async () => {
		await expect(renderWelcomeCard(card({ displayName: " " }))).resolves.toBeDefined();
	});

	it("renders a large member count without throwing", async () => {
		await expect(renderWelcomeCard(card({ memberCount: 9_999_999 }))).resolves.toBeDefined();
	});

	/** A corrupt or half-uploaded background must not cost the member their greeting. */
	it("falls back to the gradient when the background cannot be decoded", async () => {
		const attachment = await renderWelcomeCard(card({ background: Buffer.from("not an image") }));
		const data = attachment.attachment as Buffer;

		expect([...data.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
	});

	it("draws a background that can be decoded", async () => {
		// A one-pixel PNG is enough to prove the decode-and-cover path runs.
		const pixel = Buffer.from(
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
			"base64",
		);

		await expect(renderWelcomeCard(card({ background: pixel }))).resolves.toBeInstanceOf(AttachmentBuilder);
	});
});
