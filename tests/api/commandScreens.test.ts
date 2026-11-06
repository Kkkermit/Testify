import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Collection } from "discord.js";
import { type TestifyClient } from "@core/client";
import { loadEverything } from "@core/loader";
import { createLogger } from "@core/logger";

const DASHBOARD = resolve(__dirname, "../../dashboard/src");

const client = {
	commands: new Collection(),
	aliases: new Collection(),
	buttons: new Collection(),
	contextMenus: new Collection(),
	messageHandlers: [],
	logger: createLogger("fatal", false),
	on: () => undefined,
	once: () => undefined,
} as unknown as TestifyClient;
loadEverything(client);

const names = [
	...readFileSync(resolve(DASHBOARD, "features/commands/commands.utils.ts"), "utf8").matchAll(
		/^\t"?([a-z-]+)"?: \{ path: \((?:guildId)?\) =>/gm,
	),
].map(([, name = ""]) => name);

describe("the commands the dashboard says it has a screen for", () => {
	/** The sticky screen was keyed `sticky` while the command is `sticky-message`, so the page called it Discord-only. */
	it("names only commands the bot has", () => {
		expect(names.length).toBeGreaterThan(40);
		expect(names.filter((name) => !client.commands.has(name))).toEqual([]);
	});
});
