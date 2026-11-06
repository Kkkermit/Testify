import { Collection, PermissionsBitField } from "discord.js";
import { parseCustomId } from "@core/button";
import { UserFacingError } from "@core/errors";
import {
	reportDestination,
	reportForm,
	reportLimitProblem,
	reportPost,
	sendReport,
} from "@lib/modmail/messageReport.util";
import { REPORT_LIMITS } from "@lib/modmail/modmail.constants";

jest.mock("@lib/modmail/modmailActions.util", () => ({
	readModmailSettings: jest.fn(() =>
		Promise.resolve({ enabled: true, channelId: STAFF, canUse: true, pingRoleId: null, anonymous: false, open: 0 }),
	),
}));

const { readModmailSettings } = jest.requireMock("@lib/modmail/modmailActions.util");

const GUILD = "400000000000000004";
const SOURCE = "500000000000000005";
const STAFF = "500000000000000009";
const MESSAGE = "800000000000000008";
const REPORTER = "200000000000000002";
const AUTHOR = "300000000000000003";

function message(overrides: object = {}) {
	return {
		id: MESSAGE,
		guildId: GUILD,
		channelId: SOURCE,
		system: false,
		content: "Everyone @everyone look at this",
		createdTimestamp: 1_700_000_000_000,
		attachments: new Collection(),
		author: { id: AUTHOR, username: "mallory" },
		...overrides,
	};
}

function world(options: { visible?: boolean; deleted?: boolean } = {}) {
	const staff = { id: STAFF, isSendable: () => true, send: jest.fn(() => Promise.resolve()) };
	const source = {
		id: SOURCE,
		isTextBased: () => true,
		permissionsFor: () => new PermissionsBitField(options.visible === false ? 0n : PermissionsBitField.All),
		messages: {
			fetch: jest.fn((id: string) =>
				options.deleted === true ? Promise.reject(new Error("Unknown")) : Promise.resolve(message({ id })),
			),
		},
	};
	const guild = {
		id: GUILD,
		channels: {
			fetch: jest.fn((id: string) => Promise.resolve(id === SOURCE ? source : null)),
			cache: new Collection([[STAFF, staff]]),
		},
	};
	const reporter = { id: REPORTER, user: { id: REPORTER, username: "alice" }, guild };
	return { guild, reporter, staff };
}

beforeEach(() => jest.clearAllMocks());

describe("reportForm", () => {
	it("carries the message and puts the reporter last, as the router checks", () => {
		const { args } = parseCustomId(reportForm({ channelId: SOURCE, id: MESSAGE }, REPORTER).data.custom_id ?? "");
		expect(args).toEqual([SOURCE, MESSAGE, REPORTER]);
	});
});

describe("reportPost", () => {
	/** The quote is the reported person's own words, so it must never ping, whatever it says. */
	it("pings only the role the server chose, never what the message mentions", () => {
		const quiet = reportPost({
			reporter: { id: REPORTER, username: "alice" },
			message: message() as never,
			reason: "Spam",
			pingRoleId: null,
		});
		const pinged = reportPost({
			reporter: { id: REPORTER, username: "alice" },
			message: message() as never,
			reason: "Spam",
			pingRoleId: "600000000000000006",
		});

		expect(quiet.allowedMentions).toEqual({ parse: [], roles: [] });
		expect(quiet.content).toBeUndefined();
		expect(pinged.allowedMentions).toEqual({ parse: [], roles: ["600000000000000006"] });
		expect(pinged.content).toBe("<@&600000000000000006>");
	});

	it("names the author, the reporter and the reason, and stays inside Discord's limits", () => {
		const long = message({ content: "x".repeat(5_000) });
		const [built] = reportPost({
			reporter: { id: REPORTER, username: "alice" },
			message: long as never,
			reason: "Spam",
			pingRoleId: null,
		}).embeds as { toJSON(): { description?: string; fields?: { value: string }[] } }[];
		const json = built!.toJSON();

		expect(json.description!.length).toBeLessThanOrEqual(REPORT_LIMITS.quoteLength);
		expect(json.fields!.map((field) => field.value).join(" ")).toEqual(
			expect.stringContaining(`<@${AUTHOR}> (mallory)`),
		);
		expect(json.fields!.map((field) => field.value)).toContain("Spam");
	});
});

describe("reportDestination", () => {
	it("refuses your own message, Discord's own, and a server with no mod mail", async () => {
		const { guild } = world();

		await expect(reportDestination(guild as never, AUTHOR, message() as never)).rejects.toThrow(/your own/);
		await expect(reportDestination(guild as never, REPORTER, message({ system: true }) as never)).rejects.toThrow(
			/Discord's own/,
		);

		readModmailSettings.mockResolvedValueOnce({ enabled: false, channelId: STAFF, canUse: true, pingRoleId: null });
		await expect(reportDestination(guild as never, REPORTER, message() as never)).rejects.toThrow(
			/has not set up mod mail/,
		);
	});
});

describe("sendReport", () => {
	it("posts the report to the mod mail channel", async () => {
		const { reporter, staff } = world();

		await sendReport(reporter as never, SOURCE, MESSAGE, "Spam");

		expect(staff.send).toHaveBeenCalledTimes(1);
	});

	/** One person reporting the same message twice, or reporting everything, is noise in the staff channel. */
	it("takes one report of a message, and a handful an hour, from each person", async () => {
		const { reporter } = world();

		await sendReport(reporter as never, SOURCE, MESSAGE, "Spam");
		await expect(sendReport(reporter as never, SOURCE, MESSAGE, "Spam")).rejects.toThrow(/already/);

		for (let index = 1; index < REPORT_LIMITS.perHour; index += 1) {
			await sendReport(reporter as never, SOURCE, `90000000000000000${String(index)}`, "Spam");
		}
		await expect(sendReport(reporter as never, SOURCE, "900000000000000099", "Spam")).rejects.toThrow(/last hour/);

		expect(reportLimitProblem(GUILD, "200000000000000099", MESSAGE)).toBeNull();
		expect(reportLimitProblem(GUILD, REPORTER, MESSAGE, Date.now() + 2 * 60 * 60 * 1_000)).toBeNull();
	});

	it("refuses a message that is gone, or in a channel the reporter cannot see", async () => {
		await expect(sendReport(world({ deleted: true }).reporter as never, SOURCE, MESSAGE, "Spam")).rejects.toThrow(
			/deleted/,
		);
		await expect(sendReport(world({ visible: false }).reporter as never, SOURCE, MESSAGE, "Spam")).rejects.toThrow(
			UserFacingError,
		);
	});
});
