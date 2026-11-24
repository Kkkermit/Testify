import { type Guild, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { UserFacingError } from "@core/errors";
import { type VerifyConfig } from "@lib/settings/settings.types";
import { publishVerifyPanel, roleTooHigh } from "@lib/settings/verifyActions.util";

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
	/** Discord refuses the grant and says nothing until the moment it has to, so the form has to check first. */
	it("catches a role at or above the bot's own", () => {
		const guild = guildWith(null, { r: { managed: false, position: 5 } }, 5);
		expect(roleTooHigh(guild, "r")).toBe(true);
	});

	/** A managed role belongs to another integration and can never be handed out, whatever its position. */
	it("refuses a managed role", () => {
		const guild = guildWith(null, { r: { managed: true, position: 1 } }, 5);
		expect(roleTooHigh(guild, "r")).toBe(true);
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

	/** A text channel the bot may see, holding `granted` there. */
	function channelGranting(granted: bigint[], extra: Record<string, unknown> = {}): unknown {
		return {
			isSendable: () => true,
			isTextBased: () => true,
			isThread: () => false,
			toString: () => `<#${CHANNEL}>`,
			guild: { members: { me: {} } },
			permissionsFor: () => new PermissionsBitField(granted),
			...extra,
		};
	}

	/** Somebody deleted it, and sending a replacement beats leaving the server with no panel. */
	it("sends a replacement when the stored message is gone", async () => {
		const send = jest.fn(() => Promise.resolve({ id: "new" }));
		const channel = channelGranting(
			[PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
			{ send, messages: { fetch: jest.fn(() => Promise.reject(new Error("unknown message"))) } },
		);

		await expect(publishVerifyPanel(guildWith(channel), config({ messageId: "gone" }))).resolves.toBe("new");
	});

	/** Access taken away after the channel was picked reached Discord, which refused the post as "Missing Access". */
	it("names the permission it lost before trying to post", async () => {
		const send = jest.fn();
		const channel = channelGranting([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages], { send });

		await expect(publishVerifyPanel(guildWith(channel), config())).rejects.toThrow(/embed links/i);
		expect(send).not.toHaveBeenCalled();
	});
});
