import { type Guild } from "discord.js";
import { type ComponentInteraction } from "@core/button";
import { UserFacingError } from "@core/errors";
import { pickedChannelId, requireSendable } from "@lib/channelPick.util";

/**
 * The one place four panels agree on what a postable channel is.
 *
 * Each of them carried its own copy of this, refusal message included, so a change to the rule in one panel
 * left the other three disagreeing about which channels a server could choose.
 */

function guildWith(channel: unknown): Guild {
	return { channels: { fetch: jest.fn().mockResolvedValue(channel) } } as unknown as Guild;
}

function channelSelect(values: string[]): ComponentInteraction {
	return { isChannelSelectMenu: () => true, values } as unknown as ComponentInteraction;
}

const sendable = { isSendable: () => true };

describe("pickedChannelId", () => {
	it("returns the channel the menu picked", async () => {
		await expect(pickedChannelId(channelSelect(["123"]), guildWith(sendable))).resolves.toBe("123");
	});

	/** A handler treats null as nothing to do, so the wrong component type must not throw. */
	it("ignores an interaction that is not a channel select", async () => {
		const notASelect = { isChannelSelectMenu: () => false } as unknown as ComponentInteraction;

		await expect(pickedChannelId(notASelect, guildWith(sendable))).resolves.toBeNull();
	});

	it("ignores a select that carries no channel", async () => {
		await expect(pickedChannelId(channelSelect([]), guildWith(sendable))).resolves.toBeNull();
	});

	it("refuses a channel the bot cannot post in", async () => {
		const guild = guildWith({ isSendable: () => false });

		await expect(pickedChannelId(channelSelect(["123"]), guild)).rejects.toThrow(UserFacingError);
	});
});

describe("requireSendable", () => {
	it("accepts a channel the bot can post in", async () => {
		await expect(requireSendable(guildWith(sendable), "123")).resolves.toBeUndefined();
	});

	/** A deleted channel comes back as null from the fetch, which must read as "pick another" rather than a crash. */
	it("refuses a channel that no longer exists", async () => {
		const guild = {
			channels: { fetch: jest.fn().mockRejectedValue(new Error("Unknown Channel")) },
		} as unknown as Guild;

		await expect(requireSendable(guild, "123")).rejects.toThrow(/cannot post in that channel/i);
	});
});
