import { type GuildTextBasedChannel, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { UserFacingError } from "@core/errors";
import { missingToPost, requirePostable } from "@lib/discord/channels.util";

function channelWhere(granted: bigint[], { thread = false } = {}): GuildTextBasedChannel {
	return {
		isThread: () => thread,
		isTextBased: () => true,
		guild: { members: { me: { id: "bot" } } },
		permissionsFor: () => new PermissionsBitField(granted),
		toString: () => "<#500000000000000005>",
	} as unknown as GuildTextBasedChannel;
}

describe("missingToPost", () => {
	/** `isSendable()` only asks the channel's type, so a channel the bot cannot see passed it and Discord answered 50001. */
	it("names View Channel for a channel the bot cannot see", () => {
		expect(missingToPost(channelWhere([]))).toEqual(["ViewChannel", "SendMessages"]);
	});

	/** Discord asks Send Messages in Threads of a thread, and a thread that only had Send Messages was refused. */
	it("asks a thread for Send Messages in Threads instead of Send Messages", () => {
		const thread = channelWhere([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages], { thread: true });

		expect(missingToPost(thread)).toEqual(["SendMessagesInThreads"]);
	});

	it("adds what the post itself needs, and nothing for an administrator", () => {
		const canPost = channelWhere([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]);

		expect(missingToPost(canPost, [PermissionFlagsBits.EmbedLinks])).toEqual(["EmbedLinks"]);
		expect(missingToPost(channelWhere([PermissionFlagsBits.Administrator]), [PermissionFlagsBits.EmbedLinks])).toEqual(
			[],
		);
	});
});

describe("requirePostable", () => {
	it("refuses in the reader's language, naming the channel and each permission missing", () => {
		const viewOnly = channelWhere([PermissionFlagsBits.ViewChannel]);

		expect(() => {
			requirePostable(viewOnly, "de", [PermissionFlagsBits.EmbedLinks]);
		}).toThrow(
			new UserFacingError(
				"In <#500000000000000005> fehlen mir diese Berechtigungen: `Nachrichten senden` und `Links einbetten`",
			),
		);
	});
});
