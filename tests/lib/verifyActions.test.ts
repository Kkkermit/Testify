import { type Guild } from "discord.js";
import { UserFacingError } from "@core/errors";
import { publishVerifyPanel, roleTooHigh } from "@lib/verifyActions.util";
import { type VerifyConfig } from "@lib/verifyPanel.util";

const CHANNEL = "400000000000000001";

function config(overrides: Partial<VerifyConfig> = {}): VerifyConfig {
	return {
		channelId: CHANNEL,
		roleId: "300000000000000001",
		messageId: null,
		message: "Press to verify",
		verifiedCount: 0,
		...overrides,
	};
}

function guildWith(channel: unknown, roles: Record<string, unknown> = {}, myPosition = 5): Guild {
	return {
		id: "900000000000000001",
		name: "Test Server",
		iconURL: () => null,
		channels: { fetch: jest.fn(() => Promise.resolve(channel)) },
		roles: { cache: new Map(Object.entries(roles)) },
		members: { me: { roles: { highest: { position: myPosition } } } },
	} as unknown as Guild;
}

describe("roleTooHigh", () => {
	it("says no when there is no role chosen yet", () => {
		expect(roleTooHigh(guildWith(null), null)).toBe(false);
	});

	/** Discord refuses the grant and says nothing until the moment it has to, so the form has to check first. */
	it("catches a role at or above the bot's own", () => {
		const guild = guildWith(null, { r: { managed: false, position: 5 } }, 5);
		expect(roleTooHigh(guild, "r")).toBe(true);
	});

	it("allows a role below the bot's own", () => {
		const guild = guildWith(null, { r: { managed: false, position: 2 } }, 5);
		expect(roleTooHigh(guild, "r")).toBe(false);
	});

	/** A managed role belongs to another integration and can never be handed out, whatever its position. */
	it("refuses a managed role", () => {
		const guild = guildWith(null, { r: { managed: true, position: 1 } }, 5);
		expect(roleTooHigh(guild, "r")).toBe(true);
	});

	it("says no about a role the guild does not have", () => {
		expect(roleTooHigh(guildWith(null), "missing")).toBe(false);
	});
});

describe("publishVerifyPanel", () => {
	it("refuses without a channel rather than guessing one", async () => {
		await expect(publishVerifyPanel(guildWith(null), config({ channelId: null }))).rejects.toThrow(UserFacingError);
	});

	/** Permissions change after setup, and the message names the fix rather than reporting a raw Discord error. */
	it("refuses a channel it can no longer post in", async () => {
		const channel = { isSendable: () => false };
		await expect(publishVerifyPanel(guildWith(channel), config())).rejects.toThrow(/cannot post/i);
	});

	it("sends a new panel when none has been posted", async () => {
		const send = jest.fn(() => Promise.resolve({ id: "999" }));
		const channel = { isSendable: () => true, send, messages: { fetch: jest.fn() } };

		await expect(publishVerifyPanel(guildWith(channel), config())).resolves.toBe("999");
		expect(send).toHaveBeenCalled();
	});

	it("edits the panel already posted rather than sending a second one", async () => {
		const edit = jest.fn(() => Promise.resolve());
		const send = jest.fn();
		const channel = {
			isSendable: () => true,
			send,
			messages: { fetch: jest.fn(() => Promise.resolve({ id: "888", edit })) },
		};

		await expect(publishVerifyPanel(guildWith(channel), config({ messageId: "888" }))).resolves.toBe("888");
		expect(edit).toHaveBeenCalled();
		expect(send).not.toHaveBeenCalled();
	});

	/** Somebody deleted it. Sending a replacement beats failing, which would leave the server with no panel. */
	it("sends a replacement when the stored message is gone", async () => {
		const send = jest.fn(() => Promise.resolve({ id: "new" }));
		const channel = {
			isSendable: () => true,
			send,
			messages: { fetch: jest.fn(() => Promise.reject(new Error("unknown message"))) },
		};

		await expect(publishVerifyPanel(guildWith(channel), config({ messageId: "gone" }))).resolves.toBe("new");
	});
});
