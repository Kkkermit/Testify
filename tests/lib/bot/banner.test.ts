import { type TestifyClient } from "@core/client";
import { bannerLines, bigText, ICONS, printBanner, printReloading } from "@lib/bot/banner.util";
import { createMockClient } from "@tests/helpers/mocks";

const FACTS = {
	name: "Testify",
	servers: 12,
	members: 48_213,
	commands: 87,
	prefix: "t?",
	scope: "every server",
	startupMs: 1_843,
	loaded: { commands: 87, buttons: 10, events: 16, messageHandlers: 8 },
	watching: false,
	dashboardUrl: null,
};
const ESCAPE = "\u001b";

describe("bigText", () => {
	it("renders six lines of one width, skipping characters it has no glyph for", () => {
		for (const name of ["Testify", "A", "A-B✓"]) {
			const lines = bigText(name);
			expect(lines).toHaveLength(6);
			expect(new Set(lines.map((line) => [...line].length)).size).toBe(1);
		}
	});

	it("returns nothing for a name it cannot draw at all, and draws an accented letter as the letter", () => {
		expect(bigText("✓✓✓")).toEqual([]);
		expect(bigText("Café")).toEqual(bigText("Cafe"));
	});

	/** A bot called Fixxer2.0 was drawn as FIXXER20, because the font had no full stop. */
	it("draws the punctuation a bot's name can hold, each glyph a rectangle", () => {
		const width = (text: string): number => [...(bigText(text)[0] ?? "")].length;
		const punctuation = [...".,!?:;'\"-_+=/\\|()[]<>#$%&*@^"];
		const broken = punctuation.filter((mark) => {
			const lines = bigText(mark);
			return lines.length !== 6 || new Set(lines.map((line) => [...line].length)).size !== 1 || width(mark) === 0;
		});

		expect(broken).toEqual([]);
		expect(width("Fixxer2.0")).toBe(width("Fixxer20") + width("."));
	});
});

describe("bannerLines", () => {
	/** What the loader found is on it, so a category failing to load is visible. */
	it("reports the facts it was given and what the loader found, each with an icon", () => {
		const text = bannerLines(FACTS, false).join("\n");

		for (const fact of ["Testify", "48,213", "1,843ms", "t?", "every server", "87 loaded", "16 loaded", "8 loaded"]) {
			expect(text).toContain(fact);
		}
		expect(text).toContain("🤖");
		expect(text).toContain("📦 Loaded from disk");
	});

	it("is coloured only for a terminal", () => {
		expect(bannerLines(FACTS, false).join("")).not.toContain(ESCAPE);
		expect(bannerLines(FACTS, true).join("")).toContain(ESCAPE);
	});

	it("survives a bot named something it cannot draw", () => {
		expect(() => bannerLines({ ...FACTS, name: "!!!" }, false)).not.toThrow();
	});
});

/** The rows are padded on the assumption that every icon takes two terminal columns. */
describe("row icons", () => {
	it("are each two columns wide", () => {
		const narrow = Object.entries(ICONS).filter(([, icon]) => !/^\p{Emoji_Presentation}$/u.test(icon));

		expect(narrow.map(([name]) => name)).toEqual([]);
	});

	it("line every colon up in the same column", () => {
		const rows = bannerLines(FACTS, false).filter((line) => line.includes(" : "));
		expect(rows.length).toBeGreaterThan(4);

		// Two columns per icon, one per remaining character.
		const columnOf = (row: string): number => {
			const upToColon = row.slice(0, row.indexOf(":"));
			return [...upToColon].reduce((n, char) => n + (/\p{Emoji_Presentation}/u.test(char) ? 2 : 1), 0);
		};

		expect(new Set(rows.map(columnOf)).size).toBe(1);
	});
});

describe("printBanner", () => {
	function clientFor(nodeEnv = "production", env: Record<string, unknown> = {}): TestifyClient {
		return createMockClient({
			env: { DISCORD_OWNER_IDS: [], NODE_ENV: nodeEnv, ...env },
			commands: new Map([["ping", {}]]),
			startedAt: Date.now() - 500,
		} as never);
	}

	const ready = {
		user: { username: "Testify" },
		guilds: {
			cache: {
				size: 2,
				reduce: (fn: (t: number, g: { memberCount: number }) => number, seed: number) => fn(seed, { memberCount: 40 }),
			},
		},
	} as never;

	const loaded = { commands: 87, buttons: 10, events: 16, messageHandlers: 8 };

	let written: string;
	let spy: jest.SpyInstance;

	beforeEach(() => {
		written = "";
		spy = jest.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
			written += String(chunk);
			return true;
		});
	});

	afterEach(() => spy.mockRestore());

	/** One write, so the banner cannot be interleaved with a log line. */
	it("writes the whole banner in a single call", () => {
		printBanner(clientFor(), ready, "t?", "every server", loaded);
		expect(spy).toHaveBeenCalledTimes(1);
	});

	/** The API logs the port it binds, which in development is not the address anybody opens. */
	it("prints the base URL a browser opens, not the address the API binds", () => {
		const client = clientFor("development", {
			DASHBOARD_ENABLED: true,
			DASHBOARD_BASE_URL: "http://localhost:5174",
			DASHBOARD_BIND: "127.0.0.1",
			DASHBOARD_PORT: 3_000,
		});

		printBanner(client, ready, "t?", "every server", loaded);

		expect(written).toContain("http://localhost:5174");
		expect(written).not.toContain("127.0.0.1:3000");
	});

	it("falls back to the bind address when no base URL is set", () => {
		const client = clientFor("production", {
			DASHBOARD_ENABLED: true,
			DASHBOARD_BIND: "127.0.0.1",
			DASHBOARD_PORT: 3_000,
		});

		printBanner(client, ready, "t?", "every server", loaded);

		expect(written).toContain("http://127.0.0.1:3000");
	});

	it("says nothing about a dashboard that is switched off", () => {
		printBanner(clientFor(), ready, "t?", "every server", loaded);
		expect(written).not.toContain("Dashboard");
	});

	/** Shown while watching, so a developer knows saving will restart the bot. */
	it("mentions hot reload only in development", () => {
		printBanner(clientFor("development"), ready, "t?", "every server", loaded);
		expect(written).toContain("Hot reload");

		written = "";
		printBanner(clientFor(), ready, "t?", "every server", loaded);
		expect(written).not.toContain("Hot reload");
	});
});

describe("printReloading", () => {
	it("says a change was detected, so a restart is not mistaken for a crash", () => {
		let written = "";
		const spy = jest.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
			written += String(chunk);
			return true;
		});

		printReloading();
		spy.mockRestore();

		expect(written).toContain("Change detected");
		expect(written).toContain("reloading");
	});
});
