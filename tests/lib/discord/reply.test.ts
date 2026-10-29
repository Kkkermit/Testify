import { reply } from "@lib/discord/reply.util";
import { createMockInteraction } from "@tests/helpers/mocks";

describe("reply", () => {
	/** A second `reply()` edits instead, which avoids `InteractionAlreadyReplied`. */
	it("edits instead when something already replied", async () => {
		const interaction = createMockInteraction({ overrides: { replied: true } });
		await reply(interaction, { content: "second" });

		expect(interaction.editReply).toHaveBeenCalledWith({ content: "second" });
		expect(interaction.reply).not.toHaveBeenCalled();
	});
});
