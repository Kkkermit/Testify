import { AttachmentBuilder } from "discord.js";
import { coverRect, renderWelcomeCard, type WelcomeCardData } from "@lib/canvas/welcomeCard.util";

/** Rendered for real through `@napi-rs/canvas` rather than against a mocked context. */
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

describe("coverRect", () => {
	const target = { width: 1_024, height: 400 };

	/** The same maths as CSS object-fit: cover — fill the card, crop the overflow. */
	it("fills exactly when the aspect ratio already matches", () => {
		expect(coverRect({ width: 2_048, height: 800 }, target)).toEqual({ x: 0, y: 0, width: 1_024, height: 400 });
	});

	/** Never stretches: both axes scale by the same factor. */
	it("keeps the aspect ratio", () => {
		const rect = coverRect({ width: 300, height: 900 }, target);
		expect(rect.width / rect.height).toBeCloseTo(300 / 900, 5);
	});
});

describe("renderWelcomeCard", () => {
	it("produces a Discord attachment", async () => {
		await expect(renderWelcomeCard(card())).resolves.toBeInstanceOf(AttachmentBuilder);
	});

	/** A corrupt or half-uploaded background must not cost the member their greeting. */
	it("falls back to the gradient when the background cannot be decoded", async () => {
		const attachment = await renderWelcomeCard(card({ background: Buffer.from("not an image") }));
		const data = attachment.attachment as Buffer;

		expect([...data.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
	});
});
