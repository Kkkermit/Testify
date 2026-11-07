import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { Collection } from "discord.js";
import { globSync } from "glob";
import { createApi } from "@api/server";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { type Command, subcommandsOf } from "@core/command";
import { loadEverything } from "@core/loader";
import { loadArticles } from "@lib/support/supportArticles.util";
import { resetSupportDesk, supportContext, supportDesk } from "@lib/support/supportDesk.util";
import {
	BOT_FEATURE_KEYS,
	BOT_FEATURES,
	type BotFeature,
	commandIsOff,
	ownerOf,
	partIsOff,
	switchedOff,
} from "@testify/shared";
import { createMockClient } from "@tests/helpers/mocks";

/** `DISABLED_FEATURES` is only as good as the declaration it reads, so each line of it is checked against the bot. */

const SRC = resolve(__dirname, "..", "..", "src");

function loaded(off: ReadonlySet<BotFeature> = new Set()) {
	const client = {
		commands: new Collection<string, Command>(),
		aliases: new Collection<string, string>(),
		buttons: new Collection<string, unknown>(),
		contextMenus: new Collection<string, unknown>(),
		messageHandlers: [] as { name: string }[],
		on: jest.fn(),
		once: jest.fn(),
	};
	const counts = loadEverything(client as unknown as TestifyClient, off);
	return { ...client, counts };
}

const full = loaded();
const eventFiles = globSync("events/**/*.event.{js,ts}", { cwd: SRC, ignore: ["events/message/**"] }).map((file) =>
	basename(file).replace(/\.event\.(js|ts)$/, ""),
);
const articleIds = loadArticles().flatMap((result) => (result.ok ? [result.article.entry.id] : []));
const API_ENV = { DASHBOARD_ENABLED: true, DASHBOARD_PORT: 3_000, DASHBOARD_BIND: "127.0.0.1" } as Env;
const apiPaths = createApi(createMockClient(), API_ENV)
	.routes.filter((route) => route.method !== "ALL")
	.map((route) => route.path.replace(/^\/api/, ""));

/** Whether a mounted route serves the declared path or something under it; a `:param` on either side matches. */
function serves(mounted: string, declared: string): boolean {
	const have = mounted.split("/").filter(Boolean);
	const want = declared.split("/").filter(Boolean);
	return (
		want.length <= have.length &&
		want.every((segment, at) => segment.startsWith(":") || (have[at] ?? "").startsWith(":") || segment === have[at])
	);
}

describe("the feature declaration", () => {
	/** A misspelt part is never switched off, and nothing else would notice. */
	it("names only parts the bot has", () => {
		const missing: string[] = [];
		for (const feature of BOT_FEATURE_KEYS) {
			const parts = BOT_FEATURES[feature];
			for (const name of parts.commands) {
				const [command = "", subcommand] = name.split(" ");
				const found = full.commands.get(command);
				const ok =
					found !== undefined &&
					(subcommand === undefined || subcommandsOf(found).some((sub) => sub.name === subcommand));
				if (!ok) missing.push(`${feature} command ${name}`);
			}
			for (const id of parts.buttons ?? []) if (!full.buttons.has(id)) missing.push(`${feature} button ${id}`);
			for (const name of parts.menus ?? []) if (!full.contextMenus.has(name)) missing.push(`${feature} menu ${name}`);
			for (const name of parts.messageHandlers ?? []) {
				if (!full.messageHandlers.some((handler) => handler.name === name)) missing.push(`${feature} handler ${name}`);
			}
			for (const name of parts.events ?? []) if (!eventFiles.includes(name)) missing.push(`${feature} event ${name}`);
			for (const id of parts.articles ?? []) if (!articleIds.includes(id)) missing.push(`${feature} article ${id}`);
			for (const route of parts.routes ?? []) {
				if (!apiPaths.some((path) => serves(path, route))) missing.push(`${feature} route ${route}`);
			}
		}

		expect(missing).toEqual([]);
	});

	/** A part two features claim is switched off by either, which is never what the second one meant. */
	it("gives every part one owner", () => {
		const kinds = ["commands", "buttons", "menus", "messageHandlers", "events", "jobs", "articles"] as const;
		const twice = kinds.flatMap((kind) => {
			const names = BOT_FEATURE_KEYS.flatMap((feature) => BOT_FEATURES[feature][kind] ?? []);
			return names.filter((name, at) => names.indexOf(name) !== at).map((name) => `${kind} ${name}`);
		});

		expect(twice).toEqual([]);
	});

	/** An article about one feature that is not listed under it would still be offered once the feature is off. */
	it("lists every article that is only about one feature under that feature", () => {
		const unlisted = loadArticles().flatMap((result) => {
			if (!result.ok || result.article.commands.length === 0) return [];
			const owners = new Set(result.article.commands.map((name) => ownerOf("commands", name)));
			const [owner] = [...owners];
			if (owners.size !== 1 || owner === null || owner === undefined) return [];
			const id = result.article.entry.id;
			return ownerOf("articles", id) === owner ? [] : [`${id} belongs to ${owner}`];
		});

		expect(unlisted).toEqual([]);
	});
});

/** The src/lib folder only one feature uses, so a part importing it is that feature's. */
const FOLDERS: Readonly<Record<string, BotFeature>> = {
	music: "music",
	casino: "casino",
	tickets: "tickets",
	giveaways: "giveaways",
	modmail: "modmail",
	appeals: "appeals",
	starboard: "starboard",
	ideas: "ideas",
	tempVoice: "temp-voice",
	birthdays: "birthdays",
	invites: "invites",
	levelling: "levelling",
};

/** Shared by several features, each of which they ask about by name before doing its part. */
const SHARED = [
	"events/ready/scheduleJobs.event.ts",
	"events/create/guildMemberAdd.event.ts",
	"events/create/guildMemberRemove.event.ts",
];

/** A new music button nobody declared would keep answering on a bot with music switched off. */
it("declares every part that imports a feature's own folder under that feature", () => {
	const exported = (file: string): { name?: string; id?: string } =>
		jest.requireActual<{ default: { name?: string; id?: string } }>(resolve(SRC, file)).default;
	const parts: [string, Parameters<typeof ownerOf>[0], (file: string) => string][] = [
		["commands/*/*.command.ts", "commands", (file) => exported(file).name ?? ""],
		["buttons/**/*.ts", "buttons", (file) => exported(file).id ?? ""],
		["menus/*.menu.ts", "menus", (file) => exported(file).name ?? ""],
		["events/message/**/*.event.ts", "messageHandlers", (file) => exported(file).name ?? ""],
		["events/**/*.event.ts", "events", (file) => basename(file).replace(/\.event\.ts$/, "")],
	];
	const undeclared = parts.flatMap(([pattern, kind, nameOf]) =>
		globSync(pattern, { cwd: SRC, posix: true, ignore: kind === "events" ? ["events/message/**"] : [] })
			.filter((file) => !SHARED.includes(file))
			.flatMap((file) => {
				const used = [...readFileSync(resolve(SRC, file), "utf8").matchAll(/@lib\/(\w+)/g)].flatMap(
					([, folder = ""]) => FOLDERS[folder] ?? [],
				);
				const owner = ownerOf(kind, nameOf(file));
				return [...new Set(used)].filter((feature) => owner !== feature).map((feature) => `${file} uses ${feature}`);
			}),
	);

	expect(undeclared).toEqual([]);
});

describe("the loader with a feature switched off", () => {
	/** Every feature is tried, so a part left behind or a neighbour taken with it fails by name. */
	it("registers everything except what that feature, and whatever needs it, owns", () => {
		const wrong: string[] = [];

		for (const feature of BOT_FEATURE_KEYS) {
			const { off } = switchedOff([feature]);
			const some = loaded(off);

			for (const [name, command] of full.commands) {
				const subs = subcommandsOf(command).map((sub) => sub.name);
				const keptSubs = subs.filter((sub) => !commandIsOff(off, name, sub));
				const expected = !commandIsOff(off, name) && (subs.length === 0 || keptSubs.length > 0);
				const actual = some.commands.get(name);
				if ((actual !== undefined) !== expected) wrong.push(`${feature}: /${name}`);
				if (
					actual !== undefined &&
					subcommandsOf(actual)
						.map((sub) => sub.name)
						.join() !== keptSubs.join()
				) {
					wrong.push(`${feature}: /${name}'s subcommands`);
				}
			}
			for (const id of full.buttons.keys()) {
				if (some.buttons.has(id) === partIsOff(off, "buttons", id)) wrong.push(`${feature}: button ${id}`);
			}
			for (const name of full.contextMenus.keys()) {
				if (some.contextMenus.has(name) === partIsOff(off, "menus", name)) wrong.push(`${feature}: menu ${name}`);
			}
			for (const { name } of full.messageHandlers) {
				const kept = some.messageHandlers.some((handler) => handler.name === name);
				if (kept === partIsOff(off, "messageHandlers", name)) wrong.push(`${feature}: handler ${name}`);
			}
			const events = eventFiles.filter((name) => partIsOff(off, "events", name)).length;
			if (some.counts.events !== full.counts.events - events) wrong.push(`${feature}: events`);
		}

		expect(wrong).toEqual([]);
	});

	/** Discord refuses a subcommand group with nothing in it, and a prefix run would reach a run meant as a fallback. */
	it("drops a command once every one of its subcommands is off", () => {
		const some = loaded(switchedOff(["economy", "levelling"]).off);

		expect(["leaderboard", "give", "reset"].filter((name) => some.commands.has(name))).toEqual([]);
		expect(
			subcommandsOf(loaded(switchedOff(["economy"]).off).commands.get("leaderboard")!).map((sub) => sub.name),
		).toEqual(["levels"]);
	});
});

describe("a switched-off feature's routes", () => {
	const app = createApi(createMockClient({ featuresOff: switchedOff([...BOT_FEATURE_KEYS]).off }), API_ENV);
	const concrete = (path: string): string =>
		`/api${path.replace(":guildId", "400000000000000004").replace(":userId", "200000000000000002")}`;

	/** The screens are gone from the page, but a request typed by hand must find nothing behind them either. */
	it("answer 404, whoever asks", async () => {
		const routes = BOT_FEATURE_KEYS.flatMap((feature) => BOT_FEATURES[feature].routes ?? []);
		const answers = await Promise.all(
			routes.map(async (route) => {
				const response = await app.request(concrete(route));
				const body = (await response.json()) as { error?: { code?: string } };
				return `${route} ${String(response.status)} ${body.error?.code ?? ""}`;
			}),
		);

		expect(answers).toEqual(routes.map((route) => `${route} 404 feature_off`));
	});

	it("leave every other route as it was", async () => {
		const response = await app.request(concrete("/guilds/:guildId/welcome"));
		const body = (await response.json()) as { error?: { code?: string } };

		expect(body.error?.code).not.toBe("feature_off");
	});

	it("are named to the page, so it can leave their screens out", async () => {
		const response = await app.request("/api/site");

		expect(((await response.json()) as { featuresOff: string[] }).featuresOff).toEqual([...BOT_FEATURE_KEYS]);
	});
});

describe("the help desk with a feature switched off", () => {
	afterEach(() => {
		resetSupportDesk();
	});

	/** Somebody asking about music on a bot without it would be told how to use a command that is not there. */
	it("offers none of its articles or command pages, and warns about no link that pointed at them", () => {
		const warn = jest.fn();
		const off = switchedOff(["music", "economy"]).off;
		const logger = { warn, debug: jest.fn(), info: jest.fn(), error: jest.fn(), trace: jest.fn() };
		const client = createMockClient({ featuresOff: off, logger: logger as never });
		loadEverything(client, off);

		const ids = supportDesk(client)
			.catalogue(supportContext("t?"))
			.map((entry) => entry.id);
		const gone = [...off].flatMap((feature) => [
			...(BOT_FEATURES[feature].articles ?? []),
			...BOT_FEATURES[feature].commands.filter((name) => !name.includes(" ")).map((name) => `command-${name}`),
		]);

		expect(ids.filter((id) => gone.includes(id))).toEqual([]);
		expect(ids).toEqual(expect.arrayContaining(["welcome", "command-help"]));
		expect(warn).not.toHaveBeenCalled();
	});
});
