import { PermissionFlagsBits, PermissionsBitField, type TextChannel } from "discord.js";
import announce from "@commands/moderation/announce.command";
import { dispatch } from "@core/command";
import { UserFacingError } from "@core/errors";
import {
	CHANNEL_ID,
	createMockChannel,
	createMockClient,
	createMockGuild,
	createMockInteraction,
	createMockMember,
	mockCollection,
} from "@tests/helpers/mocks";

function announcing(granted: bigint[]): { channel: TextChannel; run: () => Promise<void> } {
	const guild = createMockGuild();
	const channel = createMockChannel({
		guild,
		isThread: jest.fn(() => false),
		permissionsFor: jest.fn(() => new PermissionsBitField(granted)),
		toString: () => `<#${CHANNEL_ID}>`,
	} as never);
	const interaction = createMockInteraction({
		options: { channel, title: "Maintenance", description: "Back at six." },
		overrides: {
			guild: { ...guild, channels: { cache: mockCollection([[CHANNEL_ID, channel]]) } },
			member: createMockMember({ guild }),
		} as never,
	});

	return { channel, run: () => dispatch(interaction, announce, createMockClient()) };
}

describe("/announce", () => {
	/** Discord refused the post with 50001 Missing Access, which reached the reader as an unexpected failure. */
	it("refuses a channel the bot cannot see before trying to post in it", async () => {
		const { channel, run } = announcing([]);

		await expect(run()).rejects.toThrow(
			new UserFacingError(
				`I need these permissions in <#${CHANNEL_ID}>: \`view channel\`, \`send messages\` and \`embed links\``,
			),
		);
		expect(channel.send).not.toHaveBeenCalled();
	});

	it("posts where the bot can see, send and embed", async () => {
		const { channel, run } = announcing([
			PermissionFlagsBits.ViewChannel,
			PermissionFlagsBits.SendMessages,
			PermissionFlagsBits.EmbedLinks,
		]);

		await run();

		expect(channel.send).toHaveBeenCalledTimes(1);
	});
});
