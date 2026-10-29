import { PermissionFlagsBits, PermissionsBitField } from "discord.js";
import starboardSettings from "@buttons/starboardSettings";
import { UserFacingError } from "@core/errors";
import { applyStarboardSettings, readStarboardSettings } from "@lib/starboard";
import { type StarboardSettings } from "@testify/shared";

jest.mock("@lib/starboard", () => ({
	...jest.requireActual<object>("@lib/starboard"),
	applyStarboardSettings: jest.fn(),
	readStarboardSettings: jest.fn(),
}));
jest.mock("@lib/discord", () => ({
	...jest.requireActual<object>("@lib/discord"),
	pickedChannelId: jest.fn(() => Promise.resolve("400000000000000009")),
}));

const STAFF = new PermissionsBitField([PermissionFlagsBits.ManageGuild]);
const OWNER = "100000000000000001";
const CURRENT: StarboardSettings = {
	enabled: false,
	channelId: "400000000000000009",
	threshold: 3,
	selfStar: false,
	canSend: true,
	posts: 0,
};

function pressed(
	kind: "button" | "modal" | "channel",
	options: { permissions?: PermissionsBitField; typed?: string } = {},
) {
	return {
		guild: { id: "900000000000000001" },
		user: { id: OWNER },
		memberPermissions: options.permissions ?? STAFF,
		isButton: () => kind === "button",
		isModalSubmit: () => kind === "modal",
		isChannelSelectMenu: () => kind === "channel",
		isFromMessage: () => true,
		fields: { getTextInputValue: () => options.typed ?? "" },
		update: jest.fn(() => Promise.resolve()),
		showModal: jest.fn(() => Promise.resolve()),
	};
}

const context = (action: string) => ({ client: {} as never, action, args: [OWNER] });

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(readStarboardSettings).mockResolvedValue(CURRENT);
	jest
		.mocked(applyStarboardSettings)
		.mockImplementation((_guild, patch) => Promise.resolve({ ...CURRENT, ...patch } as StarboardSettings));
});

describe("the starboard panel", () => {
	/** A role can be taken away while the panel is open, so Manage Server is asked on every press. */
	it("refuses anybody without Manage Server, before anything changes", async () => {
		const interaction = pressed("button", { permissions: new PermissionsBitField([]) });

		await expect(starboardSettings.run(interaction as never, context("toggle"))).rejects.toThrow(UserFacingError);
		expect(applyStarboardSettings).not.toHaveBeenCalled();
	});

	it("refuses a number out of range in words", async () => {
		await expect(
			starboardSettings.run(pressed("modal", { typed: "500" }) as never, context("save-threshold")),
		).rejects.toThrow(/whole number of stars/);
	});

	it("moves the board to the channel picked, and flips the author's own star", async () => {
		await starboardSettings.run(pressed("channel") as never, context("channel"));
		expect(applyStarboardSettings).toHaveBeenCalledWith(expect.anything(), { channelId: "400000000000000009" }, OWNER);

		await starboardSettings.run(pressed("button") as never, context("self"));
		expect(applyStarboardSettings).toHaveBeenLastCalledWith(expect.anything(), { selfStar: true }, OWNER);
	});
});
