import welcome from "@commands/settings/welcome.command";
import { UserFacingError } from "@core/errors";
import { saveWelcome } from "@database/repositories/welcomeRepository";
import { createMockClient, createMockInteraction } from "@tests/helpers/mocks";

jest.mock("@database/repositories/welcomeRepository", () => ({
	getWelcome: jest.fn(() => Promise.resolve(null)),
	saveWelcome: jest.fn(() => Promise.resolve()),
}));
jest.mock("@lib/welcome", () => ({
	...jest.requireActual<object>("@lib/welcome"),
	normaliseWelcome: jest.fn(() => ({ enabled: true })),
	checkBackground: jest.fn(() => ({ ok: true })),
}));

/** The download's timeout runs on through the body, so an upload that stops arriving is the upload's fault, not a bug. */
it("says an image that stopped arriving could not be downloaded, and keeps nothing", async () => {
	const stalled = new DOMException("The operation was aborted due to timeout", "TimeoutError");
	jest
		.spyOn(globalThis, "fetch")
		.mockResolvedValue({ ok: true, arrayBuffer: () => Promise.reject(stalled) } as unknown as Response);
	const image = { url: "https://cdn.discordapp.com/a.png", contentType: "image/png", name: "a.png", size: 100 };
	const interaction = createMockInteraction({ subcommand: "background", options: { image: image as never } });

	const background = welcome.subcommands?.find((subcommand) => subcommand.name === "background");
	await expect(background?.run(interaction, createMockClient())).rejects.toBeInstanceOf(UserFacingError);
	expect(saveWelcome).not.toHaveBeenCalled();
});

/** The card decodes the whole picture for every member who joins, and a few kilobytes can claim 50,000 pixels a side. */
it("refuses a background claiming more pixels than can be decoded safely, and keeps nothing", async () => {
	const bomb = Buffer.alloc(33);
	Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bomb, 0);
	bomb.writeUInt32BE(13, 8);
	bomb.write("IHDR", 12, "ascii");
	bomb.writeUInt32BE(50_000, 16);
	bomb.writeUInt32BE(50_000, 20);
	jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(bomb));
	const image = { url: "https://cdn.discordapp.com/a.png", contentType: "image/png", name: "a.png", size: 33 };
	const interaction = createMockInteraction({ subcommand: "background", options: { image: image as never } });

	const background = welcome.subcommands?.find((subcommand) => subcommand.name === "background");
	await expect(background?.run(interaction, createMockClient())).rejects.toThrow(/pixels wide or high/);
	expect(saveWelcome).not.toHaveBeenCalled();
});
