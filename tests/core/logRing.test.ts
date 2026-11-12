import { createLogger } from "@core/logger";
import { LogRing, redact } from "@core/logRing";

function record(level: "info" | "warn" | "error" = "info", message = "hello", context = {}) {
	return { at: Date.now(), level, message, context } as const;
}

describe("redact", () => {
	/** Anything that looks like a secret is redacted before the line is kept. */
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

	/** A Discord error's reason sits in its own fields and several levels down, which a name and a stack lose. */
	it("keeps every field of an error, deep enough to read Discord's reason, and what caused it", () => {
		const error = Object.assign(new Error("Invalid Form Body", { cause: new Error("socket closed") }), {
			code: 50035,
			rawError: { errors: { message_reference: { _errors: [{ code: "MESSAGE_REFERENCE_UNKNOWN_MESSAGE" }] } } },
		});

		const cleaned = redact({ err: error }) as { err: Record<string, unknown> };

		expect(cleaned.err).toMatchObject({ code: 50035, cause: { message: "socket closed" } });
		expect(JSON.stringify(cleaned.err["rawError"])).toContain("MESSAGE_REFERENCE_UNKNOWN_MESSAGE");
	});

	/** What a failed request was sending can be somebody's own words, and logs are kept across restarts. */
	it("leaves out what a failed request was sending", () => {
		const error = Object.assign(new Error("Missing Access"), { requestBody: { json: { content: "my reminder" } } });

		expect(JSON.stringify(redact({ err: error }))).not.toContain("my reminder");
	});

	/** `JSON.stringify` throws on a bigint, which would lose the line and every one written with it. */
	it("writes a bigint as a string", () => {
		expect(JSON.stringify(redact({ permissions: 8n }))).toBe('{"permissions":"8"}');
	});
});

describe("the log ring", () => {
	/** A buffer that grows forever is a leak, and this one is fed by every log line the bot writes. */
	it("keeps only the most recent lines once it is full", () => {
		const ring = new LogRing(3);
		for (const message of ["a", "b", "c", "d", "e"]) ring.push(record("info", message));

		expect(ring.size).toBe(3);
		expect(ring.recent().lines.map((line) => line.message)).toEqual(["e", "d", "c"]);
	});

	it("honours a limit, and says how many matched before it was applied", () => {
		const ring = new LogRing(10);
		for (const message of ["a", "b", "c"]) ring.push(record("info", message));

		const { lines, matched } = ring.recent({ limit: 2 });

		expect(lines.map((line) => line.message)).toEqual(["c", "b"]);
		expect(matched).toBe(3);
	});

	/** The database is handed each line once, and a refused batch goes back ahead of anything newer. */
	it("hands over new lines once, and takes refused ones back in order", () => {
		const ring = new LogRing(10);
		ring.push(record("info", "a"));
		ring.push(record("info", "b"));

		const taken = ring.takeUnsent();
		ring.push(record("info", "c"));
		ring.putBack(taken);

		expect(taken.map((line) => line.seq)).toEqual([1, 2]);
		expect(ring.takeUnsent().map((line) => line.message)).toEqual(["a", "b", "c"]);
		expect(ring.takeUnsent()).toEqual([]);
	});

	/** A database that is away for hours must not turn the queue into a leak. */
	it("bounds the lines waiting for the database", () => {
		const ring = new LogRing(3);
		for (const message of ["a", "b", "c", "d", "e"]) ring.push(record("info", message));

		expect(ring.takeUnsent().map((line) => line.message)).toEqual(["c", "d", "e"]);
	});

	/** Delete my data reaches the logs in memory too, waiting lines included. */
	it("forgets every line that mentions an id", () => {
		const ring = new LogRing(10);
		ring.push(record("error", "[COMMAND_ERROR] A command failed.", { user: "927917673344557108" }));
		ring.push(record("info", "[READY] Online"));

		ring.forget("927917673344557108");

		expect(ring.recent().lines.map((line) => line.message)).toEqual(["[READY] Online"]);
		expect(ring.takeUnsent().map((line) => line.message)).toEqual(["[READY] Online"]);
	});

	it("counts the errors and warnings it holds", () => {
		const ring = new LogRing(10);
		for (const level of ["error", "warn", "info", "error"] as const) ring.push(record(level));

		expect(ring.tally()).toMatchObject({ errors: 2, warnings: 1 });
	});

	describe("searching", () => {
		function searchable(): LogRing {
			const ring = new LogRing(10);
			ring.push(record("info", "[READY] Testify is online"));
			ring.push(record("error", "[BAN] Failed", { guildId: "900000000000000001" }));
			return ring;
		}

		/** A guild id is never in the message, so a search that only read the message would never find one. */
		it("matches a value inside the context", () => {
			const found = searchable().recent({ search: "900000000000000001" });

			expect(found.lines.map((line) => line.message)).toEqual(["[BAN] Failed"]);
		});
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

	/** Nothing at a call site changes, and the owner console still sees the line. */
	it("copies what the bot logs into the ring", () => {
		const ring = new LogRing(10);
		const logger = createLogger("info", false, ring);

		logger.error({ guildId: "900000000000000001" }, "[BAN] Failed to ban member");

		expect(ring.recent().lines[0]).toMatchObject({
			level: "error",
			message: "[BAN] Failed to ban member",
			context: { guildId: "900000000000000001" },
		});
	});

	/** Every level is captured, so the console can filter to debug after the fact. */
	it("captures debug and trace as well", () => {
		const ring = new LogRing(10);
		const logger = createLogger("trace", false, ring);

		logger.trace("very fine detail");
		logger.debug("per-message chatter");
		logger.info("worth keeping");

		expect(ring.recent().lines.map((line) => line.message)).toEqual([
			"worth keeping",
			"per-message chatter",
			"very fine detail",
		]);
	});

	/** pino never calls the hook below its own level, so `LOG_LEVEL` still decides what exists at all. */
	it("records nothing the logger's own level suppresses", () => {
		const ring = new LogRing(10);
		const logger = createLogger("warn", false, ring);

		logger.debug("suppressed");
		logger.warn("kept");

		expect(ring.recent().lines.map((line) => line.message)).toEqual(["kept"]);
	});
});
