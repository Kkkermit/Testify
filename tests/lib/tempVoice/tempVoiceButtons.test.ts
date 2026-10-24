import { PermissionFlagsBits, PermissionsBitField } from "discord.js";
import tempVoiceSettings from "@buttons/tempVoiceSettings";
import { UserFacingError } from "@core/errors";
import { applyTempVoiceSettings, makeLobby, readTempVoiceSettings } from "@lib/tempVoice";
import { type TempVoiceSettings } from "@testify/shared";

jest.mock("@lib/tempVoice", () => ({
	...jest.requireActual<object>("@lib/tempVoice"),
	applyTempVoiceSettings: jest.fn(),
	makeLobby: jest.fn(),
	readTempVoiceSettings: jest.fn(),
}));

const STAFF = new PermissionsBitField([PermissionFlagsBits.ManageGuild]);
const OWNER = "100000000000000001";
const CURRENT: TempVoiceSettings = {
	enabled: false,
	lobbyChannelId: "400000000000000001",
	categoryId: null,
	nameTemplate: "{user}'s channel",
	userLimit: 0,
	canManage: true,
	active: 0,
};

function pressed(
	kind: "button" | "modal" | "channel",
	options: { permissions?: PermissionsBitField; typed?: string; values?: string[] } = {},
) {
	return {
		guild: { id: "900000000000000001" },
		user: { id: OWNER },
		memberPermissions: options.permissions ?? STAFF,
		values: options.values ?? [],
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
	jest.mocked(readTempVoiceSettings).mockResolvedValue(CURRENT);
	jest
		.mocked(applyTempVoiceSettings)
		.mockImplementation((_guild, patch) => Promise.resolve({ ...CURRENT, ...patch } as TempVoiceSettings));
	jest.mocked(makeLobby).mockResolvedValue({ ...CURRENT, lobbyChannelId: "400000000000000002" });
});

describe("the join-to-create panel", () => {
	it("belongs to the person who opened it, and refuses anybody without Manage Server", async () => {
		expect(tempVoiceSettings.ownerOnly).toBe(true);

		await expect(
			tempVoiceSettings.run(
				pressed("button", { permissions: new PermissionsBitField([]) }) as never,
				context("toggle"),
			),
		).rejects.toThrow(UserFacingError);
		expect(applyTempVoiceSettings).not.toHaveBeenCalled();
	});

	it("sets the lobby and the category from the pickers, and clears the category when emptied", async () => {
		await tempVoiceSettings.run(pressed("channel", { values: ["400000000000000005"] }) as never, context("lobby"));
		expect(applyTempVoiceSettings).toHaveBeenLastCalledWith(
			expect.anything(),
			{ lobbyChannelId: "400000000000000005" },
			OWNER,
		);

		await tempVoiceSettings.run(pressed("channel", { values: [] }) as never, context("category"));
		expect(applyTempVoiceSettings).toHaveBeenLastCalledWith(expect.anything(), { categoryId: null }, OWNER);
	});

	it("asks for the name and the limit in forms filled in with the current ones, and saves them", async () => {
		const naming = pressed("button");
		await tempVoiceSettings.run(naming as never, context("name"));
		expect(JSON.stringify(naming.showModal.mock.calls[0])).toContain("{user}'s channel");

		await tempVoiceSettings.run(pressed("modal", { typed: "🎮 {user}" }) as never, context("save-name"));
		expect(applyTempVoiceSettings).toHaveBeenLastCalledWith(expect.anything(), { nameTemplate: "🎮 {user}" }, OWNER);

		await tempVoiceSettings.run(pressed("modal", { typed: "4" }) as never, context("save-limit"));
		expect(applyTempVoiceSettings).toHaveBeenLastCalledWith(expect.anything(), { userLimit: 4 }, OWNER);
	});

	it("makes a lobby and turns the feature on", async () => {
		await tempVoiceSettings.run(pressed("button") as never, context("make-lobby"));
		expect(makeLobby).toHaveBeenCalledWith(expect.anything(), OWNER);

		await tempVoiceSettings.run(pressed("button") as never, context("toggle"));
		expect(applyTempVoiceSettings).toHaveBeenLastCalledWith(expect.anything(), { enabled: true }, OWNER);
	});
});
