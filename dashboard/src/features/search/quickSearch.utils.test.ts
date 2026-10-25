import { type TFunction } from "i18next";
import {
	fold,
	scoreOf,
	type SearchEntry,
	searchEntries,
	searchFor,
	shortcutLabel,
} from "@/features/search/quickSearch.utils";
import { i18next } from "@/i18n";
import { catalogue } from "@/test/fixtures/bot";
import { aGuild, cannotAdd, withoutBot } from "@/test/fixtures/session";

const t = i18next.t.bind(i18next) as TFunction;
const second = { ...aGuild, id: "900000000000000009", name: "Café Crew" };

function entriesIn(guild: typeof aGuild | undefined) {
	return searchEntries({
		t,
		guild,
		guilds: [aGuild, second, withoutBot, cannotAdd],
		isOwner: false,
		commands: catalogue.commands,
	});
}

describe("searchEntries", () => {
	it("offers every server the bot is in, and none it is not", () => {
		const servers = entriesIn(undefined).filter((entry) => entry.kind === "server");

		expect(servers.map((entry) => entry.label)).toEqual(["Test Server", "Café Crew"]);
		expect(servers[0]?.to).toBe(`/guilds/${aGuild.id}`);
	});

	it("reaches a server's screens only from inside that server", () => {
		expect(entriesIn(undefined).some((entry) => entry.to.endsWith("/welcome"))).toBe(false);
		expect(entriesIn(aGuild).find((entry) => entry.label === "Welcome")?.to).toBe(`/guilds/${aGuild.id}/welcome`);
	});

	/** "ban" was the request: a command with a screen goes to that screen, named as the sidebar names it. */
	it("sends a command to the screen that configures it", () => {
		const ban = entriesIn(aGuild).find((entry) => entry.label === "/ban");

		expect(ban?.to).toBe(`/guilds/${aGuild.id}/members`);
		expect(ban?.detail).toBe("Set up on Leaderboards");
	});

	it("sends a command with no screen to the command list, filtered to it", () => {
		const ban = entriesIn(undefined).find((entry) => entry.label === "/ban");

		expect(ban?.to).toBe("/commands?q=ban");
	});
});

describe("searchFor", () => {
	it("puts the screen before the command of the same name", () => {
		const results = searchFor(entriesIn(aGuild), "levelling");

		expect(results.slice(0, 2).map((entry) => entry.kind)).toEqual(["screen", "command"]);
	});

	it("finds a server by part of its name, ignoring accents", () => {
		expect(searchFor(entriesIn(aGuild), "cafe").map((entry) => entry.label)).toContain("Café Crew");
		expect(searchFor(entriesIn(aGuild), "crew")[0]?.label).toBe("Café Crew");
	});

	it("needs every word, so a second word narrows the list", () => {
		const one = searchFor(entriesIn(aGuild), "server", 50);
		const two = searchFor(entriesIn(aGuild), "server test", 50);

		expect(two.length).toBeLessThan(one.length);
		expect(two[0]?.label).toBe("Test Server");
	});

	it("matches on a hint as well as a label", () => {
		expect(searchFor(entriesIn(aGuild), "online").map((entry) => entry.label)).toContain("Status");
	});

	it("finds nothing for nonsense", () => {
		expect(searchFor(entriesIn(aGuild), "zzqx")).toEqual([]);
	});

	it("offers the first screens and servers before anything is typed, and no commands", () => {
		const results = searchFor(entriesIn(aGuild), "  ");

		expect(results).toHaveLength(8);
		expect(results.every((entry) => entry.kind !== "command")).toBe(true);
	});
});

describe("scoreOf", () => {
	const entry: SearchEntry = {
		id: "x",
		kind: "screen",
		label: "Audit logging",
		detail: "Events posted to a channel",
		to: "/",
		icon: null,
		terms: [],
	};

	it("ranks an exact label over a prefix over a word over the hint", () => {
		expect(scoreOf(entry, "audit logging")).toBe(0);
		expect(scoreOf(entry, "audit")).toBe(1);
		expect(scoreOf(entry, "log")).toBe(2);
		expect(scoreOf(entry, "channel")).toBe(3);
		expect(scoreOf(entry, "")).toBeNull();
	});
});

describe("fold and shortcutLabel", () => {
	it("folds case and accents", () => {
		expect(fold("Paramètres")).toBe("parametres");
	});

	it("names the key the reader's keyboard has", () => {
		expect(shortcutLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)")).toBe("⌘K");
		expect(shortcutLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("Ctrl K");
	});
});
