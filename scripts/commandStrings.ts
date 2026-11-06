import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Collection } from "discord.js";
import { type TestifyClient } from "@core/client";
import { type Command } from "@core/command";
import { commandStrings, menuStrings } from "@core/commandLocales";
import { type ContextMenu } from "@core/contextMenu";
import { loadEverything } from "@core/loader";
import { createLogger } from "@core/logger";
import { assetPath } from "@core/paths";

/** Writes assets/locales/commands/en.json, the English every translation of the command menus is made from. */

const client = {
	commands: new Collection<string, Command>(),
	aliases: new Collection<string, string>(),
	buttons: new Collection(),
	contextMenus: new Collection<string, ContextMenu>(),
	messageHandlers: [],
	logger: createLogger("fatal", false),
	on: () => undefined,
	once: () => undefined,
} as unknown as TestifyClient;

loadEverything(client);

const strings = [
	...[...client.commands.values()].sort((a, b) => a.name.localeCompare(b.name)).flatMap(commandStrings),
	...[...client.contextMenus.values()].sort((a, b) => a.name.localeCompare(b.name)).flatMap(menuStrings),
];

const target = assetPath("locales", "commands", "en.json");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(
	target,
	`${JSON.stringify(Object.fromEntries(strings.map(({ key, text }) => [key, text])), null, "\t")}\n`,
);
console.log(`Wrote assets/locales/commands/en.json with ${strings.length} strings.`);
