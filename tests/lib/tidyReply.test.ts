import { type EmbedBuilder, type Message } from "discord.js";
import { type TestifyClient } from "@core/client";
import { errorEmbed } from "@lib/embeds.util";
import { cleanupFooter, replyTemporarily, TIDY_AFTER_MS } from "@lib/tidyReply.util";

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
	it("says how long the message will stay", () => {
		expect(cleanupFooter(8_000)).toBe("This message disappears in 8 seconds.");
	});

	it("uses the singular for one second", () => {
		expect(cleanupFooter(1_000)).toContain("1 second.");
	});

	/** Sub-second values would otherwise read as "0 seconds". */
	it("never claims zero seconds", () => {
		expect(cleanupFooter(200)).toContain("1 second");
	});

	it("defaults to the shared delay", () => {
		expect(cleanupFooter()).toBe(cleanupFooter(TIDY_AFTER_MS));
	});
});

describe("replyTemporarily", () => {
	it("replies with the embed", async () => {
		const { client, message } = harness();
		await replyTemporarily(client, message, errorEmbed("Nope."));

		expect(message.reply).toHaveBeenCalledTimes(1);
	});

	it("puts the cleanup notice in the footer", async () => {
		const { client, message } = harness();
		await replyTemporarily(client, message, errorEmbed("Nope."));

		const sent = (message.reply as jest.Mock).mock.calls[0]?.[0] as { embeds: EmbedBuilder[] };
		expect(sent.embeds[0]?.toJSON().footer?.text).toBe(cleanupFooter());
	});

	/**
	 * Scheduled through the client's registry rather than a bare `setTimeout`, so a shutdown cancels it instead of
	 * holding the process open.
	 */
	it("schedules the delete on the client's timers", async () => {
		const { client, message, after } = harness();
		await replyTemporarily(client, message, errorEmbed("Nope."));

		expect(after).toHaveBeenCalledWith("tidy:999", TIDY_AFTER_MS, expect.any(Function));
	});

	it("deletes the reply when the timer fires", async () => {
		const { client, message, after, deleted } = harness();
		await replyTemporarily(client, message, errorEmbed("Nope."));

		await (after.mock.calls[0]?.[2] as () => Promise<void>)();
		expect(deleted).toHaveBeenCalledTimes(1);
	});

	it("honours a custom delay in both the footer and the timer", async () => {
		const { client, message, after } = harness();
		await replyTemporarily(client, message, errorEmbed("Nope."), 3_000);

		const sent = (message.reply as jest.Mock).mock.calls[0]?.[0] as { embeds: EmbedBuilder[] };
		expect(sent.embeds[0]?.toJSON().footer?.text).toContain("3 seconds");
		expect(after).toHaveBeenCalledWith("tidy:999", 3_000, expect.any(Function));
	});
});
