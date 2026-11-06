import { readFileSync } from "node:fs";
import { PermissionsBitField, type PermissionsString } from "discord.js";
import { DISCORD_LOCALES, type TranslatedLanguage } from "@config/languages";
import { buildSlashCommand, subcommandsOf } from "@core/command";
import {
	commandStrings,
	DESCRIPTION_LIMIT,
	localiserFor,
	MENU_NAME_LIMIT,
	menuStrings,
	readCommandTranslations,
} from "@core/commandLocales";
import { buildContextMenu } from "@core/contextMenu";
import { permissionName } from "@core/language";
import { loadEverything } from "@core/loader";
import { assetPath } from "@core/paths";
import { humanisePermission } from "@lib/format/format.util";
import { createMockClient } from "@tests/helpers/mocks";

const client = createMockClient();
loadEverything(client);

const english = JSON.parse(readFileSync(assetPath("locales", "commands", "en.json"), "utf8")) as Record<string, string>;
const translations = readCommandTranslations();
const languages = Object.keys(DISCORD_LOCALES) as TranslatedLanguage[];

describe("the command menus in other languages", () => {
	/** The English file is what translators work from, so it must say exactly what the bot registers. */
	it("has an English source that matches the commands, or says how to bring it up to date", () => {
		const strings = [
			...[...client.commands.values()].flatMap(commandStrings),
			...[...client.contextMenus.values()].flatMap(menuStrings),
		];
		const registered = Object.fromEntries(strings.map(({ key, text }) => [key, text]));

		expect({ hint: "Run npm run i18n:commands", strings: english }).toEqual({
			hint: "Run npm run i18n:commands",
			strings: registered,
		});
	});

	/** A refusal names what is missing, and "Dir fehlen diese Berechtigungen: manage roles" is English in a German sentence. */
	it("names every permission a command or an action can ask for in every language", () => {
		const asked = new Set<PermissionsString>(
			[
				...[...client.commands.values()].flatMap((command) => [
					...(command.permissions ?? []),
					...(command.botPermissions ?? []),
					...subcommandsOf(command).flatMap((sub) => sub.permissions ?? []),
				]),
				...[...client.contextMenus.values()].flatMap((menu) => [
					...(menu.permissions ?? []),
					...(menu.botPermissions ?? []),
				]),
			].flatMap((permission) => new PermissionsBitField(permission).toArray()),
		);
		const unnamed = languages.flatMap((language) =>
			[...asked]
				.filter((flag) => permissionName(language, flag) === humanisePermission(flag))
				.map((flag) => `${language}: ${flag}`),
		);

		expect(asked.size).toBeGreaterThan(10);
		expect(unnamed).toEqual([]);
	});

	/** A missing key falls back to English silently, and a stale one names a description that no longer exists. */
	it("translates every string into every language, within Discord's limits", () => {
		const problems = languages.flatMap((language) => {
			const table = translations[language] ?? {};
			const missing = Object.keys(english).filter((key) => !(table[key] ?? "").trim());
			const stale = Object.keys(table).filter((key) => !(key in english));
			const long = Object.entries(table).filter(
				([key, text]) => text.length > (key.startsWith("menu: ") ? MENU_NAME_LIMIT : DESCRIPTION_LIMIT),
			);
			return [
				...missing.map((key) => `${language}: missing ${key}`),
				...stale.map((key) => `${language}: stale ${key}`),
				...long.map(([key]) => `${language}: too long ${key}`),
			];
		});

		expect(problems).toEqual([]);
	});

	/** `half`, `all` and `/automod list` are typed as written, so a translation must keep them as they are. */
	it("keeps every code span exactly as the English has it", () => {
		const spans = (text: string): string[] => (text.match(/`[^`]+`/g) ?? []).sort();
		const changed = languages.flatMap((language) =>
			Object.entries(english)
				.filter(([key, text]) => spans(text).join() !== spans(translations[language]?.[key] ?? "").join())
				.map(([key]) => `${language}: ${key}`),
		);

		expect(changed).toEqual([]);
	});

	it("registers each description for every locale its language covers, Spanish for Spain and Latin America", () => {
		const localise = localiserFor(translations);
		const warn = buildSlashCommand(client.commands.get("warn")!, localise).toJSON();
		const create = warn.options?.find((option) => option.name === "create") as
			| { description_localizations?: Record<string, string>; options?: { description_localizations?: unknown }[] }
			| undefined;

		expect(Object.keys(warn.description_localizations ?? {}).sort()).toEqual(
			languages.flatMap((language) => DISCORD_LOCALES[language]).sort(),
		);
		expect(warn.description_localizations?.["es-419"]).toBe(warn.description_localizations?.["es-ES"]);
		expect(create?.description_localizations?.de).toBe(translations.de?.["warn create"]);
		expect(create?.options?.[0]?.description_localizations).toBeDefined();

		const menu = buildContextMenu(client.contextMenus.get("Warn")!, localise).toJSON();
		expect(menu.name_localizations?.ja).toBe(translations.ja?.["menu: Warn"]);
	});

	it("registers English alone when nothing is translated", () => {
		expect(buildSlashCommand(client.commands.get("warn")!).toJSON().description_localizations).toBeNull();
	});
});
