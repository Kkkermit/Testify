import { PermissionFlagsBits, PermissionsBitField } from "discord.js";
import birthdaySettings from "@buttons/birthdaySettings";
import { UserFacingError } from "@core/errors";
import { applyBirthdaySettings, birthdaySettingsPanel, readBirthdayOverview } from "@lib/birthdays";
import { type BirthdayOverview } from "@testify/shared";
import { buttonsOf } from "@tests/helpers/containers";

jest.mock("@lib/birthdays", () => ({
	...jest.requireActual<object>("@lib/birthdays"),
	applyBirthdaySettings: jest.fn(),
	readBirthdayOverview: jest.fn(),
}));
jest.mock("@lib/discord", () => ({
	...jest.requireActual<object>("@lib/discord"),
	pickedChannelId: jest.fn(() => Promise.resolve("400000000000000009")),
}));

const STAFF = new PermissionsBitField([PermissionFlagsBits.ManageGuild]);
const OWNER = "100000000000000001";
const CURRENT: BirthdayOverview = {
	enabled: false,
	channelId: "400000000000000009",
	message: "Happy birthday, {user}!",
	canSend: true,
	shared: 3,
	upcoming: [],
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
	jest.mocked(readBirthdayOverview).mockResolvedValue(CURRENT);
	jest
		.mocked(applyBirthdaySettings)
		.mockImplementation((_guild, patch) => Promise.resolve({ ...CURRENT, ...patch } as BirthdayOverview));
});

describe("the birthday settings panel", () => {
	it("cannot be turned on before a channel is chosen, and pings nobody its message names", () => {
		const panel = birthdaySettingsPanel({ ...CURRENT, channelId: null, message: "@everyone" }, 0, OWNER);

		expect(buttonsOf(panel).find((button) => button.label === "Turn on")?.disabled).toBe(true);
		expect(panel.allowedMentions).toEqual({ parse: [] });
	});

	it("refuses anybody without Manage Server, before anything changes", async () => {
		await expect(
			birthdaySettings.run(pressed("button", { permissions: new PermissionsBitField([]) }) as never, context("toggle")),
		).rejects.toThrow(UserFacingError);
		expect(applyBirthdaySettings).not.toHaveBeenCalled();
	});

	it("refuses an empty message in words", async () => {
		await expect(
			birthdaySettings.run(pressed("modal", { typed: "  " }) as never, context("save-message")),
		).rejects.toThrow(/Write something/);
	});
});
