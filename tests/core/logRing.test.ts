import { createLogger, splitLogArgs } from "@core/logger";
import { LogRing, redact } from "@core/logRing";

function record(level: "info" | "warn" | "error" = "info", message = "hello", context = {}) {
	return { at: Date.now(), level, message, context } as const;
}

describe("redact", () => {
	/**
	 * The buffer ends up on a web page, which is a much easier thing to read over someone's shoulder than a
	 * terminal. One careless `logger.error({ uri }, …)` would otherwise publish a database password.
	 */
	it("removes anything that looks like a secret", () => {
		const cleaned = redact({
			DISCORD_TOKEN: "abc.def.ghi",
			mongodbUri: "mongodb+srv://user:hunter2@cluster0.example.mongodb.net",
			clientSecret: "shh",
			authorization: "Bearer x",
			apiKey: "k",
			guildId: "900000000000000001",
		}) as Record<string, unknown>;

		expect(cleaned["DISCORD_TOKEN"]).toBe("[redacted]");
		expect(cleaned["mongodbUri"]).toBe("[redacted]");
		expect(cleaned["clientSecret"]).toBe("[redacted]");
		expect(cleaned["authorization"]).toBe("[redacted]");
		expect(cleaned["apiKey"]).toBe("[redacted]");
		expect(cleaned["guildId"]).toBe("900000000000000001");
	});

	it("reaches a secret nested inside an object", () => {
		const cleaned = redact({ config: { token: "abc" } }) as { config: Record<string, unknown> };

		expect(cleaned.config["token"]).toBe("[redacted]");
	});

	/** An error's stack is the reason the buffer exists, so it has to survive being walked. */
	it("keeps an error readable", () => {
		const cleaned = redact({ err: new TypeError("bad thing") }) as { err: Record<string, unknown> };

		expect(cleaned.err["name"]).toBe("TypeError");
		expect(cleaned.err["message"]).toBe("bad thing");
		expect(cleaned.err["stack"]).toContain("bad thing");
	});

	it("stops rather than following a deep structure forever", () => {
		const deep = { a: { b: { c: { d: { e: "far" } } } } };

		expect(JSON.stringify(redact(deep))).toContain("[…]");
	});

	it("leaves ordinary values alone", () => {
		expect(redact("plain")).toBe("plain");
		expect(redact(7)).toBe(7);
		expect(redact(null)).toBeNull();
	});
});

describe("the log ring", () => {
	it("gives back what was put in, newest first", () => {
		const ring = new LogRing(10);
		ring.push(record("info", "first"));
		ring.push(record("warn", "second"));

		expect(ring.recent().map((line) => line.message)).toEqual(["second", "first"]);
	});

	/** A buffer that grows forever is a leak, and this one is fed by every log line the bot writes. */
	it("keeps only the most recent lines once it is full", () => {
		const ring = new LogRing(3);
		for (const message of ["a", "b", "c", "d", "e"]) ring.push(record("info", message));

		expect(ring.size).toBe(3);
		expect(ring.recent().map((line) => line.message)).toEqual(["e", "d", "c"]);
	});

	it("filters to a minimum level", () => {
		const ring = new LogRing(10);
		ring.push(record("info", "chatter"));
		ring.push(record("error", "broken"));

		expect(ring.recent({ minLevel: "warn" }).map((line) => line.message)).toEqual(["broken"]);
	});

	it("honours a limit", () => {
		const ring = new LogRing(10);
		for (const message of ["a", "b", "c"]) ring.push(record("info", message));

		expect(ring.recent({ limit: 2 }).map((line) => line.message)).toEqual(["c", "b"]);
	});

	it("redacts on the way in, so nothing sensitive is ever held", () => {
		const ring = new LogRing(10);
		ring.push(record("error", "failed", { token: "abc" }));

		expect(ring.recent()[0]?.context["token"]).toBe("[redacted]");
	});
});

describe("splitLogArgs", () => {
	it("separates context from message", () => {
		expect(splitLogArgs([{ guildId: "1" }, "[BAN] Something"])).toEqual({
			context: { guildId: "1" },
			message: "[BAN] Something",
		});
	});

	it("handles a bare message", () => {
		expect(splitLogArgs(["just this"])).toEqual({ context: {}, message: "just this" });
	});
});

describe("the logger's ring hook", () => {
	// A real pino logger writes to stdout, and these lines would otherwise land in the middle of the test report.
	let write: jest.SpyInstance;

	beforeEach(() => {
		write = jest.spyOn(process.stdout, "write").mockReturnValue(true);
	});

	afterEach(() => {
		write.mockRestore();
	});

	/** The whole point: nothing at a call site changes, and the owner console still sees the line. */
	it("copies what the bot logs into the ring", () => {
		const ring = new LogRing(10);
		const logger = createLogger("info", false, ring);

		logger.error({ guildId: "900000000000000001" }, "[BAN] Failed to ban member");

		expect(ring.recent()[0]).toMatchObject({
			level: "error",
			message: "[BAN] Failed to ban member",
			context: { guildId: "900000000000000001" },
		});
	});

	it("does not fill the buffer with debug noise", () => {
		const ring = new LogRing(10);
		const logger = createLogger("trace", false, ring);

		logger.debug("per-message chatter");
		logger.info("worth keeping");

		expect(ring.recent().map((line) => line.message)).toEqual(["worth keeping"]);
	});
});
