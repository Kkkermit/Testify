import { type Message } from "discord.js";
import { createLogger } from "../../src/core/logger";
import { MessagePipeline } from "../../src/core/messagePipeline";
import { createMockClient } from "../helpers/context";

const logger = createLogger({ level: "fatal", pretty: false });

function message(overrides: Record<string, unknown> = {}): Message {
	return { author: { bot: false }, guildId: "1", ...overrides } as unknown as Message;
}

describe("MessagePipeline", () => {
	it("runs processors in order", async () => {
		const pipeline = new MessagePipeline(logger);
		const order: string[] = [];

		pipeline.register({ name: "late", order: 50, run: () => Promise.resolve(void order.push("late")) });
		pipeline.register({ name: "early", order: 10, run: () => Promise.resolve(void order.push("early")) });

		await pipeline.run(createMockClient(), message());
		expect(order).toEqual(["early", "late"]);
	});

	it("stops the chain when a processor returns true", async () => {
		const pipeline = new MessagePipeline(logger);
		const later = jest.fn();

		pipeline.register({ name: "handler", order: 1, run: () => Promise.resolve(true) });
		pipeline.register({ name: "later", order: 2, run: later });

		await pipeline.run(createMockClient(), message());
		expect(later).not.toHaveBeenCalled();
	});

	it("skips bot messages unless a processor opts in", async () => {
		const pipeline = new MessagePipeline(logger);
		const normal = jest.fn();
		const opted = jest.fn();

		pipeline.register({ name: "normal", run: normal });
		pipeline.register({ name: "opted", allowBots: true, run: opted });

		await pipeline.run(createMockClient(), message({ author: { bot: true } }));

		expect(normal).not.toHaveBeenCalled();
		expect(opted).toHaveBeenCalled();
	});

	// One failing feature must not take out levelling, counting and the rest.
	it("continues after a processor throws", async () => {
		const pipeline = new MessagePipeline(logger);
		const after = jest.fn();

		pipeline.register({
			name: "boom",
			order: 1,
			run: () => {
				throw new Error("boom");
			},
		});
		pipeline.register({ name: "after", order: 2, run: after });

		await pipeline.run(createMockClient(), message());
		expect(after).toHaveBeenCalled();
	});
});
