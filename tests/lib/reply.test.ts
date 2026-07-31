import { reply } from "@lib/reply.util";
import { createMockInteraction } from "@tests/helpers/mocks";

describe("reply", () => {
	it("replies when the interaction is untouched", async () => {
		const interaction = createMockInteraction();
		await reply(interaction, { content: "hello" });

		expect(interaction.reply).toHaveBeenCalledWith({ content: "hello" });
		expect(interaction.editReply).not.toHaveBeenCalled();
	});

	it("edits instead when the command deferred first", async () => {
		const interaction = createMockInteraction({ overrides: { deferred: true } });
		await reply(interaction, { content: "hello" });

		expect(interaction.editReply).toHaveBeenCalledWith({ content: "hello" });
		expect(interaction.reply).not.toHaveBeenCalled();
	});

	/**
	 * Calling `reply()` twice is what produced unhandled `InteractionAlreadyReplied` rejections in the JavaScript
	 * codebase — finding 8.
	 */
	it("edits instead when something already replied", async () => {
		const interaction = createMockInteraction({ overrides: { replied: true } });
		await reply(interaction, { content: "second" });

		expect(interaction.editReply).toHaveBeenCalledWith({ content: "second" });
		expect(interaction.reply).not.toHaveBeenCalled();
	});

	it("collects what was sent, whichever path it took", async () => {
		const fresh = createMockInteraction();
		await reply(fresh, { content: "one" });

		const deferred = createMockInteraction({ overrides: { deferred: true } });
		await reply(deferred, { content: "two" });

		expect(fresh.sent).toEqual([{ content: "one" }]);
		expect(deferred.sent).toEqual([{ content: "two" }]);
	});
});
