import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Every guild-scoped screen names the server it is about.
 *
 * The sidebar is a drawer below `md`, so with it closed a phone shows nothing that says which server is being
 * configured — and "turn levelling off" is a different decision in each of them. `PageHeader`'s `eyebrow` is
 * where that goes, and it went unpassed on all twelve screens for as long as the prop existed.
 */

const FEATURES = resolve(__dirname, "..", "features");
const ROUTES = readFileSync(resolve(__dirname, "..", "routes.tsx"), "utf8");

/** The overview's own `<h1>` is the server name, so an eyebrow above it would say it twice. */
const NAMED_BY_ITS_TITLE = new Set(["GuildOverviewPage"]);

function guildScopedPages(): string[] {
	const found = new Set<string>();
	for (const [, component] of ROUTES.matchAll(/path: "\/guilds\/:guildId[^"]*",\s*element: \w+\(<(\w+)/g)) {
		if (component !== undefined && !NAMED_BY_ITS_TITLE.has(component)) found.add(component);
	}

	return [...found];
}

function sourceOf(component: string): string {
	for (const feature of readdirSync(FEATURES)) {
		try {
			return readFileSync(resolve(FEATURES, feature, `${component}.tsx`), "utf8");
		} catch {
			continue;
		}
	}

	throw new Error(`No source found for ${component}`);
}

describe("guild-scoped screens", () => {
	it("finds them all, so the check cannot pass vacuously", () => {
		expect(guildScopedPages().length).toBeGreaterThan(10);
	});

	it("name the server in the page header", () => {
		const silent = guildScopedPages().filter((component) => !sourceOf(component).includes("eyebrow={"));

		expect(silent).toEqual([]);
	});
});
