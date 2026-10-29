import { PermissionFlagsBits, PermissionsBitField } from "discord.js";
import schedule from "@buttons/schedule";
import { UserFacingError } from "@core/errors";
import { readSchedule, readSchedules, removeSchedule } from "@lib/scheduledMessages";
import { type ScheduledMessage } from "@testify/shared";
import { textOf } from "@tests/helpers/containers";

jest.mock("@lib/scheduledMessages", () => ({
	...jest.requireActual<object>("@lib/scheduledMessages"),
	changeSchedule: jest.fn(() => Promise.resolve({})),
	readSchedule: jest.fn(),
	readSchedules: jest.fn(),
	removeSchedule: jest.fn(() => Promise.resolve()),
}));
jest.mock("@lib/discord", () => ({
	...jest.requireActual<object>("@lib/discord"),
	pickedChannelId: jest.fn(() => Promise.resolve("400000000000000009")),
}));

const STAFF = new PermissionsBitField([PermissionFlagsBits.ManageGuild]);
const OWNER = "100000000000000001";
const NEWS: ScheduledMessage = {
	id: "a".repeat(24),
	channelId: "400000000000000001",
	message: "Weekly reminder",
	repeat: "weekly",
	nextAt: "2026-10-25T18:30:00.000Z",
	canSend: true,
};

function pressed(
	kind: "button" | "modal" | "select" | "channel",
	options: { permissions?: PermissionsBitField; fields?: Record<string, string> } = {},
) {
	return {
		guild: { id: "900000000000000001" },
		user: { id: OWNER },
		memberPermissions: options.permissions ?? STAFF,
		values: [NEWS.id],
		isButton: () => kind === "button",
		isModalSubmit: () => kind === "modal",
		isStringSelectMenu: () => kind === "select",
		isChannelSelectMenu: () => kind === "channel",
		isMessageComponent: () => kind !== "modal",
		isFromMessage: () => true,
		fields: { getTextInputValue: (id: string) => options.fields?.[id] ?? "" },
		update: jest.fn(() => Promise.resolve()),
		reply: jest.fn(() => Promise.resolve()),
		showModal: jest.fn(() => Promise.resolve()),
	};
}

const context = (action: string, ...args: string[]) => ({ client: {} as never, action, args: [...args, OWNER] });

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(readSchedule).mockResolvedValue(NEWS);
	jest.mocked(readSchedules).mockResolvedValue({ messages: [], limit: 10 });
});

describe("the scheduled message panel", () => {
	it("refuses anybody without Manage Server, before anything changes", async () => {
		await expect(
			schedule.run(
				pressed("button", { permissions: new PermissionsBitField([]) }) as never,
				context("delete-yes", NEWS.id),
			),
		).rejects.toThrow(UserFacingError);
		expect(removeSchedule).not.toHaveBeenCalled();
	});

	it("asks before deleting, then deletes and goes back to the list", async () => {
		await schedule.run(pressed("button") as never, context("delete", NEWS.id));
		expect(removeSchedule).not.toHaveBeenCalled();

		const confirming = pressed("button");
		await schedule.run(confirming as never, context("delete-yes", NEWS.id));

		expect(removeSchedule).toHaveBeenCalledWith(expect.anything(), NEWS.id);
		expect(textOf(jest.mocked(confirming.update).mock.calls[0]?.[0] as never)).toContain("Deleted.");
	});
});
