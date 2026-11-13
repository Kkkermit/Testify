import { type Guild, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { type ComponentInteraction } from "@core/button";
import { UserFacingError } from "@core/errors";
import { pickedChannelId, requireSendable } from "@lib/discord/channelPick.util";

/** The one rule for what a postable channel is, shared by every panel. */

function guildWith(channel: unknown): Guild {
	return { channels: { fetch: jest.fn().mockResolvedValue(channel) } } as unknown as Guild;
}

function channelSelect(values: string[]): ComponentInteraction {
	return { isChannelSelectMenu: () => true, values } as unknown as ComponentInteraction;
}

const sendable = { isSendable: () => true };

/** A channel of a type that can take messages, in which the bot holds only `granted`. */
function channelGranting(granted: bigint[]): unknown {
	return {
		...sendable,
		isTextBased: () => true,
		isThread: () => false,
		guild: { members: { me: { id: "bot" } } },
		permissionsFor: () => new PermissionsBitField(granted),
		toString: () => "<#123>",
	};
}

describe("pickedChannelId", () => {
	/** A handler treats null as nothing to do, so the wrong component type must not throw. */
	it("ignores an interaction that is not a channel select", async () => {
		const notASelect = { isChannelSelectMenu: () => false } as unknown as ComponentInteraction;

		await expect(pickedChannelId(notASelect, guildWith(sendable))).resolves.toBeNull();
	});

	it("refuses a channel the bot cannot post in", async () => {
		const guild = guildWith({ isSendable: () => false });

		await expect(pickedChannelId(channelSelect(["123"]), guild)).rejects.toThrow(UserFacingError);
	});

	/** A text channel the bot cannot see used to pass, and every post the panel set up there failed later. */
	it("refuses a text channel the bot cannot see or send in, saying which", async () => {
		const hidden = guildWith(channelGranting([]));
		const open = guildWith(channelGranting([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]));

		await expect(pickedChannelId(channelSelect(["123"]), hidden)).rejects.toThrow(
			"I need these permissions in <#123>: `view channel` and `send messages`",
		);
		await expect(pickedChannelId(channelSelect(["123"]), open)).resolves.toBe("123");
	});
});

describe("requireSendable", () => {
	/** A deleted channel comes back as null from the fetch, which must read as "pick another" rather than a crash. */
	it("refuses a channel that no longer exists", async () => {
		const guild = {
			channels: { fetch: jest.fn().mockRejectedValue(new Error("Unknown Channel")) },
		} as unknown as Guild;

		await expect(requireSendable(guild, "123")).rejects.toThrow(/cannot post in that channel/i);
	});
});
