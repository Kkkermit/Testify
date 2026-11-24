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
