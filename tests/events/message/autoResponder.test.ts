import { listAutoResponders } from "@database/repositories/autoResponderRepository";
import handler from "@events/message/autoResponder.event";
import { type AutoResponder } from "@testify/shared";
import { createMockClient, createMockMessage } from "@tests/helpers/mocks";

jest.mock("@database/repositories/autoResponderRepository", () => ({ listAutoResponders: jest.fn() }));

const RULES: AutoResponder = { id: "a".repeat(24), trigger: "rules", match: "word", reply: "@everyone read #rules" };

let channel = 0;

/** A fresh channel each time, so one test's answer never holds back the next one's. */
function messageSaying(content: string, overrides: Record<string, unknown> = {}) {
	channel += 1;
	return createMockMessage({
		content,
		overrides: {
			channelId: `56600000000000${String(channel).padStart(4, "0")}`,
			inGuild: () => true,
			...overrides,
		} as never,
	});
}

beforeEach(() => {
	jest.mocked(listAutoResponders).mockResolvedValue([RULES]);
});

describe("the auto-responder message handler", () => {
	/** The reply is whatever a manager typed, so it must never ping, and must not ping the person it answers. */
	it("answers the trigger with its reply, pinging nobody", async () => {
		const message = messageSaying("where are the rules?");

		await handler.run(message, createMockClient());

		expect(message.sent).toEqual([{ content: RULES.reply, allowedMentions: { parse: [], repliedUser: false } }]);
	});

	it("stays quiet when nothing matches", async () => {
		const message = messageSaying("good morning");

		await handler.run(message, createMockClient());

		expect(message.sent).toEqual([]);
	});

	it("answers a channel once, however many times the word comes up at once", async () => {
		const first = messageSaying("rules?");
		const second = messageSaying("rules!!", { channelId: first.channelId });

		await handler.run(first, createMockClient());
		await handler.run(second, createMockClient());

		expect(first.sent).toHaveLength(1);
		expect(second.sent).toEqual([]);
	});

	/** Bots never reach a handler that does not ask for them, which is what stops it answering its own reply. */
	it("does not ask to see bots", () => {
		expect(handler.allowBots).not.toBe(true);
	});

	it("ignores direct messages, system messages and channels it cannot post in", async () => {
		const direct = messageSaying("rules", { inGuild: () => false });
		const system = messageSaying("rules", { system: true });
		const silent = messageSaying("rules", { channel: { isSendable: () => false } });

		for (const message of [direct, system, silent]) await handler.run(message, createMockClient());

		expect([...direct.sent, ...system.sent, ...silent.sent]).toEqual([]);
		expect(listAutoResponders).not.toHaveBeenCalled();
	});

	it("notes a refused reply quietly, rather than failing the message", async () => {
		const client = createMockClient();
		const debug = jest.spyOn(client.logger, "debug");
		const error = jest.spyOn(client.logger, "error");
		const message = messageSaying("rules", { reply: jest.fn(() => Promise.reject(new Error("Missing Permissions"))) });

		await expect(handler.run(message, client)).resolves.toBeUndefined();
		expect(debug).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("[AUTO_RESPONDER]"));
		expect(error).not.toHaveBeenCalled();
	});
});
