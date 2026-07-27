import { AttachmentBuilder } from "discord.js";
import type * as canvasUtil from "@lib/canvas.util";
import { renderWelcomeCard } from "@lib/welcomeCard.util";
import { createMockGuild, createMockMember, createMockUser } from "@tests/helpers/mocks";

/**
 * Rendered for real through `@napi-rs/canvas` rather than against a mocked
 * context. The original card never produced an image at all — its handler took
 * its parameters in the wrong order and it called `canvas.context`, which does
 * not exist — so "does it actually come out as a PNG" is the thing worth testing.
 */
jest.mock("@lib/canvas.util", () => {
	const actual = jest.requireActual<typeof canvasUtil>("@lib/canvas.util");
	return { ...actual, drawAvatar: jest.fn(() => Promise.resolve()) };
});

function member(username = "alice", memberCount = 1_234): ReturnType<typeof createMockMember> {
	return createMockMember({
		user: createMockUser({ username, displayAvatarURL: () => "https://cdn.discord/avatar.png" }),
		displayName: username,
		guild: createMockGuild({ name: "Test Server", memberCount }),
	});
}

describe("renderWelcomeCard", () => {
	it("produces a Discord attachment", async () => {
		await expect(renderWelcomeCard(member())).resolves.toBeInstanceOf(AttachmentBuilder);
	});

	it("produces a real PNG, not an empty buffer", async () => {
		const attachment = await renderWelcomeCard(member());
		const data = attachment.attachment as Buffer;

		expect(Buffer.isBuffer(data)).toBe(true);
		expect(data.length).toBeGreaterThan(1_000);
		// PNG magic number.
		expect([...data.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
	});

	it("renders a very long username without throwing", async () => {
		await expect(renderWelcomeCard(member("a".repeat(300)))).resolves.toBeDefined();
	});

	it("renders an empty-ish username without throwing", async () => {
		await expect(renderWelcomeCard(member(" "))).resolves.toBeDefined();
	});

	it("renders a large member count without throwing", async () => {
		await expect(renderWelcomeCard(member("bob", 9_999_999))).resolves.toBeDefined();
	});
});
