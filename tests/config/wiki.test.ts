import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { INVITE_PERMISSIONS } from "@testify/shared";

/** The wiki lives outside the repository once published, so nothing else would notice a link it carries go stale. */
const ROOT = resolve(__dirname, "../..");
const WIKI = join(ROOT, "docs/wiki");
const REPOSITORY = /^https:\/\/github\.com\/Kkkermit\/Testify\/(?:blob|tree)\/main\/([^#]+)(?:#(.+))?$/;
const SITE = /^https:\/\/testify\.lol(\/[^#]*)?$/;
const INVITE = "https://discord.com/oauth2/authorize?";
const WIKI_PAGE = /^([A-Za-z][\w-]*)?(?:#(.+))?$/;

const pages = readdirSync(WIKI)
	.filter((file) => file.endsWith(".md"))
	.map((file) => file.slice(0, -".md".length));

function read(path: string): string {
	return readFileSync(path, "utf8");
}

function linksIn(text: string): string[] {
	return [...text.matchAll(/\]\(([^)\s]+)\)/g)].map((match) => match[1] ?? "");
}

/** The anchor GitHub gives a heading: emoji and punctuation go, a variation selector stays. */
function anchorsIn(text: string): Set<string> {
	const anchors = new Set<string>();
	let fenced = false;

	for (const line of text.split("\n")) {
		if (line.startsWith("```")) fenced = !fenced;
		const heading = fenced ? null : /^#{1,6} (.+)$/.exec(line);
		if (heading?.[1] !== undefined) {
			anchors.add(
				heading[1]
					.trim()
					.toLowerCase()
					.replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, "")
					.replace(/\s/g, "-"),
			);
		}
	}

	return anchors;
}

function quoted(file: string, key: string): Set<string> {
	return new Set(
		[...read(join(ROOT, file)).matchAll(new RegExp(`${key}: "([^"]+)"`, "g"))].map((match) => match[1] ?? ""),
	);
}

const docSlugs = quoted("dashboard/src/features/docs/docs.pages.ts", "slug");
const routes = quoted("dashboard/src/routes.tsx", "path");

/** Why a link leads nowhere, or null when it leads somewhere real; a bare anchor is a section of `from`. */
function problemWith(link: string, from = "Home"): string | null {
	const page = WIKI_PAGE.exec(link);
	if (page !== null) {
		const name = page[1];
		if (name !== undefined && !pages.includes(name)) return "no such wiki page";
		const anchor = page[2];
		const text = read(join(WIKI, `${name ?? from}.md`));
		return anchor === undefined || anchorsIn(text).has(decodeURIComponent(anchor)) ? null : "no such section";
	}

	const file = REPOSITORY.exec(link);
	if (file !== null) {
		const path = join(ROOT, decodeURIComponent(file[1] ?? ""));
		if (!existsSync(path)) return "no such file in the repository";
		const anchor = file[2];
		return anchor === undefined || anchorsIn(read(path)).has(decodeURIComponent(anchor)) ? null : "no such section";
	}

	const site = SITE.exec(link);
	if (site !== null) {
		const path = site[1] === undefined || site[1] === "" ? "/" : site[1];
		const guide = /^\/docs\/guides\/(.+)$/.exec(path)?.[1];
		if (guide !== undefined)
			return existsSync(join(ROOT, "assets/support", `${guide}.md`)) ? null : "no such help article";
		const doc = /^\/docs\/(.+)$/.exec(path)?.[1];
		if (doc !== undefined) return docSlugs.has(doc) ? null : "no such docs page";
		const known = [...routes].some((route) =>
			route.endsWith("/*") ? path === route.slice(0, -2) || path.startsWith(route.slice(0, -1)) : path === route,
		);
		return known ? null : "no such page on the website";
	}

	if (link.startsWith(INVITE)) {
		const query = new URL(link).searchParams;
		const scopes = (query.get("scope") ?? "").split(" ");
		if (query.get("permissions") !== INVITE_PERMISSIONS) return "asks for other permissions than the bot's own invite";
		return scopes.includes("bot") && scopes.includes("applications.commands") ? null : "is missing a scope";
	}

	return null;
}

describe("the wiki", () => {
	it("links only to pages, sections, files, help articles and screens that exist", () => {
		const broken = pages.flatMap((name) =>
			linksIn(read(join(WIKI, `${name}.md`)))
				.map((link) => ({ link, problem: problemWith(link, name) }))
				.filter((entry) => entry.problem !== null)
				.map(({ link, problem }) => `${name}: ${link} (${problem})`),
		);

		expect(broken).toEqual([]);
	});

	it("puts every page in the sidebar", () => {
		const linked = new Set(linksIn(read(join(WIKI, "_Sidebar.md"))));

		expect(pages.filter((name) => !name.startsWith("_") && !linked.has(name))).toEqual([]);
	});

	/** The README's invite once asked for Administrator while the bot's own asked for a fixed list. */
	it("invites the bot the way the bot invites itself, here and in the README", () => {
		const invites = [read(join(ROOT, "README.md")), ...pages.map((name) => read(join(WIKI, `${name}.md`)))]
			.flatMap((text) => [...text.matchAll(/https:\/\/discord\.com\/oauth2\/authorize\?[^)"\s]+/g)])
			.map((match) => match[0].replace(/&amp;/g, "&"));

		expect(invites.length).toBeGreaterThan(1);
		expect(invites.filter((link) => problemWith(link) !== null)).toEqual([]);
	});
});
