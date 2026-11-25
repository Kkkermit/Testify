import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { loadRegistry } from "./registry";
import { commandStrings, menuStrings } from "@core/commandLocales";
import { assetPath } from "@core/paths";

/** Writes assets/locales/commands/en.json, the English every translation of the command menus is made from. */

const client = loadRegistry();

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
