import { Message, type MessagePayload } from "discord.js";
import { type Env } from "@config/env";
import { TestifyClient } from "@core/client";
import { createLogger } from "@core/logger";

/** Discord refuses an unsharded bot once it is in 2,500 servers, so the client asks how many shards to run. */
it("asks Discord how many shards to run", async () => {
	const client = new TestifyClient(
		{ DISCORD_OWNER_IDS: [], DISABLED_FEATURES: [] } as unknown as Env,
		createLogger("fatal", false),
	);

	expect(client.options.shards).toBe("auto");
	await client.destroy();
});

/** `t?clear` deletes the message that ran it, and its answer, sent as a reply to that message, was refused as a crash. */
it("replies without the quote when the message being answered has gone", async () => {
	const client = new TestifyClient(
		{ DISCORD_OWNER_IDS: [], DISABLED_FEATURES: [] } as unknown as Env,
		createLogger("fatal", false),
	);
	const send = jest.fn();

	await Message.prototype.reply.call({ channel: { send }, client } as unknown as Message, { content: "Deleted 36" });

	expect((send.mock.calls[0]?.[0] as MessagePayload).options).toMatchObject({ reply: { failIfNotExists: false } });
	await client.destroy();
});
