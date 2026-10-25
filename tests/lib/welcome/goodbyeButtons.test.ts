import { MessageFlags, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import goodbye from "@buttons/goodbye";
import { UserFacingError } from "@core/errors";
import { applyGoodbye, readGoodbye } from "@lib/welcome";
import { type GoodbyeSettings } from "@testify/shared";

jest.mock("@lib/welcome", () => ({
	...jest.requireActual<object>("@lib/welcome"),
	applyGoodbye: jest.fn(),
	readGoodbye: jest.fn(),
}));
jest.mock("@lib/discord", () => ({
	...jest.requireActual<object>("@lib/discord"),
	pickedChannelId: jest.fn(() => Promise.resolve("400000000000000009")),
}));

const STAFF = new PermissionsBitField([PermissionFlagsBits.ManageGuild]);
const OWNER = "100000000000000001";
const CURRENT: GoodbyeSettings = {
	enabled: false,
	channelId: "400000000000000009",
	message: "**{username}** has left.",
	style: "text",
	canSend: true,
};

const member = {
	id: OWNER,
	user: { username: "sam", displayAvatarURL: () => "https://cdn.example/avatar.png" },
	guild: { name: "Test Server", memberCount: 41 },
};

function pressed(
	kind: "button" | "modal" | "channel",
	options: { permissions?: PermissionsBitField; typed?: string } = {},
) {
	return {
		guild: { id: "900000000000000001", members: { fetch: jest.fn(() => Promise.resolve(member)) } },
		user: { id: OWNER },
		memberPermissions: options.permissions ?? STAFF,
		isButton: () => kind === "button",
		isModalSubmit: () => kind === "modal",
		isChannelSelectMenu: () => kind === "channel",
		isFromMessage: () => true,
		fields: { getTextInputValue: () => options.typed ?? "" },
		update: jest.fn(() => Promise.resolve()),
		reply: jest.fn(() => Promise.resolve()),
		showModal: jest.fn(() => Promise.resolve()),
	};
}

const context = (action: string, ...args: string[]) => ({ client: {} as never, action, args: [...args, OWNER] });

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(readGoodbye).mockResolvedValue(CURRENT);
	jest
		.mocked(applyGoodbye)
		.mockImplementation((_guild, patch) => Promise.resolve({ ...CURRENT, ...patch } as GoodbyeSettings));
});

describe("the goodbye panel", () => {
	it("belongs to the person who opened it", () => {
		expect(goodbye.ownerOnly).toBe(true);
	});

	/** A role can be taken away while the panel is open, so Manage Server is asked on every press. */
	it("refuses anybody without Manage Server, before anything changes", async () => {
		const interaction = pressed("button", { permissions: new PermissionsBitField([]) });

		await expect(goodbye.run(interaction as never, context("toggle"))).rejects.toThrow(UserFacingError);
		expect(applyGoodbye).not.toHaveBeenCalled();
	});

	it("turns goodbyes on and redraws the panel", async () => {
		const interaction = pressed("button");

		await goodbye.run(interaction as never, context("toggle"));

		expect(applyGoodbye).toHaveBeenCalledWith(expect.anything(), { enabled: true }, OWNER);
		expect(interaction.update).toHaveBeenCalledTimes(1);
	});

	it("opens the message in a form filled with the current one, and saves what is typed", async () => {
		const opening = pressed("button");
		await goodbye.run(opening as never, context("edit"));
		expect(JSON.stringify(opening.showModal.mock.calls[0])).toContain("has left.");

		await goodbye.run(pressed("modal", { typed: "  Bye, {username}  " }) as never, context("save-message"));
		expect(applyGoodbye).toHaveBeenCalledWith(expect.anything(), { message: "Bye, {username}" }, OWNER);
	});

	it("refuses an empty message in words", async () => {
		await expect(goodbye.run(pressed("modal", { typed: "   " }) as never, context("save-message"))).rejects.toThrow(
			/Write something/,
		);
		expect(applyGoodbye).not.toHaveBeenCalled();
	});

	it("moves goodbyes to the channel picked, and switches the style", async () => {
		await goodbye.run(pressed("channel") as never, context("channel"));
		expect(applyGoodbye).toHaveBeenCalledWith(expect.anything(), { channelId: "400000000000000009" }, OWNER);

		await goodbye.run(pressed("button") as never, context("style", "embed"));
		expect(applyGoodbye).toHaveBeenLastCalledWith(expect.anything(), { style: "embed" }, OWNER);
	});

	/** The style rides in the custom ID, so anything that is not one of the two is ignored rather than stored. */
	it("ignores a style it does not know", async () => {
		await goodbye.run(pressed("button") as never, context("style", "card"));

		expect(applyGoodbye).not.toHaveBeenCalled();
	});

	it("previews the goodbye privately, filled in for the person pressing", async () => {
		const interaction = pressed("button");

		await goodbye.run(interaction as never, context("preview"));

		const [sent] = interaction.reply.mock.calls[0] as unknown as [{ content: string; flags: number }];
		expect(sent.content).toBe("**sam** has left.");
		expect(sent.flags).toBe(MessageFlags.Ephemeral);
		expect(applyGoodbye).not.toHaveBeenCalled();
	});
});
