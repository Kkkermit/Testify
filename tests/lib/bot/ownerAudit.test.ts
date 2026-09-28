import { type APIEmbed, type MessageCreateOptions } from "discord.js";
import { type Command } from "@core/command";
import {
	AttemptThrottle,
	evalLogMessage,
	OWNER_AUDIT_LIMITS,
	ownerLogChannel,
	reportEval,
	reportOwnerAttempt,
} from "@lib/bot/ownerAudit.util";
import { createMockClient, createMockInteraction, createMockUser, OWNER_ID, USER_ID } from "@tests/helpers/mocks";

const EVAL_CHANNEL = "700000000000000021";
const ERROR_CHANNEL = "700000000000000022";

const evalLike: Command = {
	name: "eval",
	description: "d",
	category: "owner",
	ownerOnly: true,
	options: [{ name: "code", description: "d", type: "string", required: true }],
	run: () => Promise.resolve(),
};

function clientWith(env: Record<string, string>, sent: { channelId: string; payload: MessageCreateOptions }[] = []) {
	return createMockClient({
		env: { DISCORD_OWNER_IDS: [OWNER_ID], ...env },
		logger: { warn: jest.fn() },
		channels: {
			fetch: jest.fn((channelId: string) =>
				Promise.resolve({
					isTextBased: () => true,
					isSendable: () => true,
					send: jest.fn((payload: MessageCreateOptions) => {
						sent.push({ channelId, payload });
						return Promise.resolve();
					}),
				}),
			),
		},
	} as never);
}

function embedOf(payload: MessageCreateOptions): APIEmbed {
	return (payload.embeds![0] as { toJSON(): APIEmbed }).toJSON();
}

describe("the owner log channel", () => {
	it("is the eval log, or the error log when that is blank", () => {
		expect(ownerLogChannel(clientWith({ CHANNEL_EVAL_LOG: EVAL_CHANNEL, CHANNEL_ERROR_LOG: ERROR_CHANNEL }))).toBe(
			EVAL_CHANNEL,
		);
		expect(ownerLogChannel(clientWith({ CHANNEL_ERROR_LOG: ERROR_CHANNEL }))).toBe(ERROR_CHANNEL);
		expect(ownerLogChannel(clientWith({}))).toBeUndefined();
	});
});

describe("the attempt throttle", () => {
	/** Somebody spamming `t?eval` must not flood the owner's channel, but the count must survive. */
	it("posts once a minute per person and command, and counts what it held back", () => {
		const throttle = new AttemptThrottle();

		expect(throttle.admit("a:eval", 0)).toBe(0);
		expect(throttle.admit("a:eval", 1_000)).toBeNull();
		expect(throttle.admit("a:eval", 2_000)).toBeNull();
		expect(throttle.admit("b:eval", 2_000)).toBe(0);
		expect(throttle.admit("a:eval", OWNER_AUDIT_LIMITS.postGapMs)).toBe(2);
	});

	it("forgets the oldest person past its limit", () => {
		const throttle = new AttemptThrottle();
		for (let index = 0; index <= OWNER_AUDIT_LIMITS.remembered; index += 1) throttle.admit(`u${String(index)}`, 0);

		expect(throttle.admit("u0", 1)).toBe(0);
		expect(throttle.admit(`u${String(OWNER_AUDIT_LIMITS.remembered)}`, 1)).toBeNull();
	});
});

describe("a refused owner-only attempt", () => {
	it("is logged and posted with who tried, where, and the code they tried", async () => {
		const sent: { channelId: string; payload: MessageCreateOptions }[] = [];
		const client = clientWith({ CHANNEL_EVAL_LOG: EVAL_CHANNEL }, sent);

		await reportOwnerAttempt(
			client,
			createMockInteraction({ options: { code: "client.token" } }),
			evalLike,
			new AttemptThrottle(),
		);

		expect(client.logger.warn).toHaveBeenCalledWith(
			expect.objectContaining({ command: "eval", userId: USER_ID, options: [{ name: "code", value: "client.token" }] }),
			expect.stringContaining("[OWNER_COMMAND]"),
		);
		expect(sent).toHaveLength(1);
		const built = embedOf(sent[0]!.payload);
		expect(sent[0]!.channelId).toBe(EVAL_CHANNEL);
		expect(built.title).toBe("🚨 Owner-only command refused · /eval");
		expect(built.description).toContain("client.token");
		expect(JSON.stringify(built.fields)).toContain(USER_ID);
		expect(sent[0]!.payload.allowedMentions).toEqual({ parse: [] });
	});

	it("still reaches the log line when no channel is set", async () => {
		const client = clientWith({});
		await reportOwnerAttempt(
			client,
			createMockInteraction({ options: { code: "1" } }),
			evalLike,
			new AttemptThrottle(),
		);

		expect(client.logger.warn).toHaveBeenCalled();
	});

	it("cannot break a code block with backticks of its own", async () => {
		const sent: { channelId: string; payload: MessageCreateOptions }[] = [];
		await reportOwnerAttempt(
			clientWith({ CHANNEL_EVAL_LOG: EVAL_CHANNEL }, sent),
			createMockInteraction({ options: { code: "```\n@everyone" } }),
			evalLike,
			new AttemptThrottle(),
		);

		expect(embedOf(sent[0]!.payload).description?.match(/```/g)).toHaveLength(2);
	});
});

describe("an eval run", () => {
	const input = () =>
		createMockInteraction({ overrides: { user: createMockUser({ id: OWNER_ID, username: "owner" }) } });

	it("posts the full code, the result, how long it took and the output", async () => {
		const sent: { channelId: string; payload: MessageCreateOptions }[] = [];
		const client = clientWith({ CHANNEL_EVAL_LOG: EVAL_CHANNEL }, sent);

		await reportEval(client, input(), { code: "1 + 1", output: "2", failed: false, elapsedMs: 1.5 });

		const built = embedOf(sent[0]!.payload);
		const byName = Object.fromEntries((built.fields ?? []).map((field) => [field.name, field.value]));
		expect(built.title).toBe("🧪 /eval ran");
		expect(built.description).toBe("```js\n1 + 1\n```");
		expect(byName.Output).toBe("```js\n2\n```");
		expect(byName.Took).toBe("1.50 ms");
		expect(client.logger.warn).toHaveBeenCalledWith(
			expect.objectContaining({ code: "1 + 1" }),
			expect.stringContaining("[EVAL]"),
		);
	});

	/** Every character of the code is kept, so a long one goes up as a file rather than being cut. */
	it("attaches code too long for the embed in full", () => {
		const code = "x".repeat(OWNER_AUDIT_LIMITS.inlineCode + 1);
		const message = evalLogMessage(input(), { code, output: "", failed: true, elapsedMs: 0 });

		expect(message.files).toHaveLength(1);
		expect(embedOf(message).description).toContain("attached in full");
		expect(embedOf(message).title).toBe("🧪 /eval threw");
	});
});
