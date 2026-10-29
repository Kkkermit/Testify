import { ContainerBuilder, type Message, MessageFlags, type TextDisplayBuilder } from "discord.js";
import { type TestifyClient } from "@core/client";
import { TIDY_AFTER_MS } from "@lib/discord/discord.constants";
import { errorEmbed } from "@lib/discord/embeds.util";
import { cleanupFooter, replyTemporarily, withTidyNote } from "@lib/discord/tidyReply.util";

/** These notices clean themselves up, and say so — a message that vanishes unannounced reads as a glitch. */
function harness(): { client: TestifyClient; message: Message; deleted: jest.Mock; after: jest.Mock } {
	const deleted = jest.fn(() => Promise.resolve());
	const after = jest.fn();

	const sent = { id: "999", delete: deleted } as unknown as Message;
	const message = { reply: jest.fn(() => Promise.resolve(sent)) } as unknown as Message;
	const client = { timers: { after } } as unknown as TestifyClient;

	return { client, message, deleted, after };
}

describe("cleanupFooter", () => {
	/** Sub-second values would otherwise read as "0 seconds". */
	it("never claims zero seconds", () => {
		expect(cleanupFooter(200)).toContain("1 second");
	});
});

describe("replyTemporarily", () => {
	/** The delete is scheduled on the client's timers, so a shutdown cancels it. */
	it("schedules the delete on the client's timers", async () => {
		const { client, message, after } = harness();
		await replyTemporarily(client, message, errorEmbed("Nope."));

		expect(after).toHaveBeenCalledWith("tidy:999", TIDY_AFTER_MS, expect.any(Function));
	});
});

describe("the note on a reply that deletes itself", () => {
	/** A V2 message may not carry content, so the note has to be a component of its own. */
	it("goes last among the components of a V2 message", () => {
		const container = new ContainerBuilder();
		const noted: { content?: string; components?: unknown[] } = withTidyNote(
			{ components: [container], flags: MessageFlags.IsComponentsV2 },
			"note",
		);

		expect(noted.content).toBeUndefined();
		expect(noted.components?.[0]).toBe(container);
		expect((noted.components?.[1] as TextDisplayBuilder).toJSON().content).toBe("note");
	});
});
