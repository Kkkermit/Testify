import { PermissionFlagsBits, PermissionsBitField } from "discord.js";
import raidButton from "@buttons/raid";
import { UserFacingError } from "@core/errors";
import { applyRaidSettings, raidPanel, readRaidOverview } from "@lib/raid";
import { DEFAULT_RAID, type RaidOverview } from "@testify/shared";
import { buttonsOf, textOf } from "@tests/helpers/containers";

jest.mock("@lib/raid", () => ({
	...jest.requireActual<object>("@lib/raid"),
	applyRaidSettings: jest.fn(),
	readRaidOverview: jest.fn(),
}));
jest.mock("@lib/discord", () => ({
	...jest.requireActual<object>("@lib/discord"),
	pickedChannelId: jest.fn(() => Promise.resolve("400000000000000009")),
}));

const STAFF = new PermissionsBitField([PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ModerateMembers]);
const OWNER = "100000000000000001";
const CURRENT: RaidOverview = { ...DEFAULT_RAID, canSend: false, canHold: true, canPing: true };

function pressed(
	kind: "button" | "modal" | "channel" | "role",
	options: { permissions?: PermissionsBitField; typed?: Record<string, string>; values?: string[] } = {},
) {
	return {
		guild: { id: "900000000000000001" },
		user: { id: OWNER },
		memberPermissions: options.permissions ?? STAFF,
		values: options.values ?? [],
		isButton: () => kind === "button",
		isModalSubmit: () => kind === "modal",
		isChannelSelectMenu: () => kind === "channel",
		isRoleSelectMenu: () => kind === "role",
		isFromMessage: () => true,
		fields: { getTextInputValue: (id: string) => options.typed?.[id] ?? "" },
		update: jest.fn(() => Promise.resolve()),
		showModal: jest.fn(() => Promise.resolve()),
	};
}

const context = (action: string) => ({ client: {} as never, action, args: [OWNER] });

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(readRaidOverview).mockResolvedValue(CURRENT);
	jest
		.mocked(applyRaidSettings)
		.mockImplementation((_guild, patch) => Promise.resolve({ ...CURRENT, ...patch } as RaidOverview));
});

describe("the raid protection panel", () => {
	it("cannot be turned on with nothing to do, and says when a hold cannot happen", () => {
		expect(buttonsOf(raidPanel(CURRENT, OWNER)).find((button) => button.label === "Turn on")?.disabled).toBe(true);

		const unable = raidPanel({ ...CURRENT, minAccountAgeDays: 7, canHold: false }, OWNER);
		expect(buttonsOf(unable).find((button) => button.label === "Turn on")?.disabled).toBe(false);
		expect(textOf(unable)).toContain("Moderate Members");
		expect(unable.allowedMentions).toEqual({ parse: [] });
	});

	/** A hold is a timeout, so somebody who could not `/mute` must not be able to set one up either. */
	it("refuses anybody without Moderate Members as well as Manage Server, before anything changes", async () => {
		const manager = new PermissionsBitField([PermissionFlagsBits.ManageGuild]);

		await expect(
			raidButton.run(pressed("button", { permissions: manager }) as never, context("toggle")),
		).rejects.toThrow(UserFacingError);
		expect(applyRaidSettings).not.toHaveBeenCalled();
	});

	it("saves a minimum age, a spike, a channel, a role, and clears both pickers", async () => {
		await raidButton.run(pressed("modal", { typed: { days: "7" } }) as never, context("save-age"));
		expect(applyRaidSettings).toHaveBeenLastCalledWith(expect.anything(), { minAccountAgeDays: 7 }, OWNER);

		await raidButton.run(pressed("modal", { typed: { joins: "15", minutes: "2" } }) as never, context("save-spike"));
		expect(applyRaidSettings).toHaveBeenLastCalledWith(expect.anything(), { spikeJoins: 15, spikeMinutes: 2 }, OWNER);

		await raidButton.run(pressed("channel", { values: ["400000000000000009"] }) as never, context("channel"));
		expect(applyRaidSettings).toHaveBeenLastCalledWith(
			expect.anything(),
			{ alertChannelId: "400000000000000009" },
			OWNER,
		);

		await raidButton.run(pressed("channel") as never, context("channel"));
		expect(applyRaidSettings).toHaveBeenLastCalledWith(expect.anything(), { alertChannelId: null }, OWNER);

		await raidButton.run(pressed("role", { values: ["300000000000000001"] }) as never, context("role"));
		expect(applyRaidSettings).toHaveBeenLastCalledWith(expect.anything(), { pingRoleId: "300000000000000001" }, OWNER);

		await raidButton.run(pressed("role") as never, context("role"));
		expect(applyRaidSettings).toHaveBeenLastCalledWith(expect.anything(), { pingRoleId: null }, OWNER);
	});

	it("refuses a minimum age past Discord's longest timeout and a spike out of range", async () => {
		await expect(
			raidButton.run(pressed("modal", { typed: { days: "30" } }) as never, context("save-age")),
		).rejects.toThrow(/0 to 28/);
		await expect(
			raidButton.run(pressed("modal", { typed: { joins: "1", minutes: "2" } }) as never, context("save-spike")),
		).rejects.toThrow(UserFacingError);
		expect(applyRaidSettings).not.toHaveBeenCalled();
	});
});
