import { type TestifyClient } from "@core/client";
import { bannerLines, bigText, ICONS, printBanner, printReloading } from "@lib/banner.util";
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
const ESCAPE = "";

describe("bigText", () => {
	it("renders six lines whatever the word", () => {
		expect(bigText("Testify")).toHaveLength(6);
		expect(bigText("A")).toHaveLength(6);
	});

	it("makes every line the same width, so the block is rectangular", () => {
		const widths = new Set(bigText("Testify").map((line) => [...line].length));
		expect(widths.size).toBe(1);
	});

	it("skips characters it has no glyph for rather than breaking the block", () => {
		const widths = new Set(bigText("A-B!").map((line) => [...line].length));
		expect(widths.size).toBe(1);
	});

	it("returns nothing for a name it cannot draw at all", () => {
		expect(bigText("!!!")).toEqual([]);
	});
});

describe("bannerLines", () => {
	it("reports the facts it was given", () => {
		const text = bannerLines(FACTS, false).join("\n");

		expect(text).toContain("Testify");
		expect(text).toContain("48,213");
		expect(text).toContain("1,843ms");
		expect(text).toContain("t?");
		expect(text).toContain("every server");
	});

	it("reports what the loader found, so a category failing to load is visible", () => {
		const text = bannerLines(FACTS, false).join("\n");

		expect(text).toContain("87 loaded");
		expect(text).toContain("16 loaded");
		expect(text).toContain("8 loaded");
	});

	it("labels each fact with an icon", () => {
		const text = bannerLines(FACTS, false).join("\n");

		expect(text).toContain("🤖");
		expect(text).toContain("📦 Loaded from disk");
	});

	it("leaves out colour when the output is not a terminal", () => {
		expect(bannerLines(FACTS, false).join("")).not.toContain(ESCAPE);
	});

	it("colours it when it is", () => {
		expect(bannerLines(FACTS, true).join("")).toContain(ESCAPE);
	});

	it("survives a bot named something it cannot draw", () => {
		expect(() => bannerLines({ ...FACTS, name: "!!!" }, false)).not.toThrow();
	});
});

/** The rows are padded on the assumption that every icon takes two terminal columns. */
describe("row icons", () => {
	it.each(Object.entries(ICONS))("%s renders two columns wide", (_name, icon) => {
		expect(icon).toMatch(/^\p{Emoji_Presentation}$/u);
	});

	it("lines every colon up in the same column", () => {
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

describe("the hot reload notice", () => {
	it("is shown while watching, so a dev knows saving will restart the bot", () => {
		expect(bannerLines({ ...FACTS, watching: true }, false).join("\n")).toContain("Hot reload is on");
	});

	it("is absent in production", () => {
		expect(bannerLines({ ...FACTS, watching: false }, false).join("\n")).not.toContain("Hot reload");
	});
});

/** The API logs the port it binds, which in development is not the address anybody opens. */
describe("the dashboard address", () => {
	it("is shown, so the page is not confused with the API's port", () => {
		const text = bannerLines({ ...FACTS, dashboardUrl: "http://localhost:5174" }, false).join("\n");

		expect(text).toContain("Dashboard");
		expect(text).toContain("http://localhost:5174");
	});

	it("is absent when the dashboard is off", () => {
		expect(bannerLines(FACTS, false).join("\n")).not.toContain("Dashboard");
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

	it("reports the facts it was handed", () => {
		printBanner(clientFor(), ready, "t?", "every server", loaded);

		expect(written).toContain("Testify");
		expect(written).toContain("t?");
		expect(written).toContain("every server");
		expect(written).toContain("87 loaded");
	});

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
