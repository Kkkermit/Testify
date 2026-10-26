import { PermissionFlagsBits } from "discord.js";
import poll from "@commands/community/poll.command";
import { dispatch } from "@core/command";
import { createMockClient, createMockInteraction } from "@tests/helpers/mocks";

describe("/poll", () => {
	it("answers with the poll itself, in public", async () => {
		const interaction = createMockInteraction({
			options: { question: "Film night?", answers: "Friday | Saturday", hours: 12 },
		});

		await dispatch(interaction, poll, createMockClient());

		expect(interaction.deferReply).not.toHaveBeenCalled();
		expect(interaction.sent[0]).toMatchObject({
			poll: { question: { text: "Film night?" }, duration: 12, allowMultiselect: false },
			allowedMentions: { parse: [] },
		});
	});

	/** Discord asks for Send Polls to make one, so the bot does not let somebody without it post one through it. */
	it("asks the person for the permission Discord asks for", () => {
		expect(poll.permissions).toEqual([PermissionFlagsBits.SendPolls]);
		expect(poll.botPermissions).toEqual([PermissionFlagsBits.SendPolls]);
	});
});
