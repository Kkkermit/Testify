import { existsSync, readFileSync } from "node:fs";
import { DISCORD_LOCALES, type TranslatedLanguage } from "@config/languages";
import { type Command, type CommandOption, stringKey, subcommandsOf } from "@core/command";
import { type ContextMenu, menuKey } from "@core/contextMenu";
import { assetPath } from "@core/paths";

/** What a command shows in Discord's menus, in the languages filed under `assets/locales/commands`. */

export interface CommandString {
	key: string;
	text: string;
}

/** Every description a command shows, under the key its translations are filed by; owner commands only owners see. */
export function commandStrings(command: Command): CommandString[] {
	if (command.ownerOnly === true) return [];
	const options = (sub: string | undefined, list: readonly CommandOption[] = []): CommandString[] =>
		list.map((option) => ({ key: stringKey(command.name, sub, option.name), text: option.description }));

	return [
		{ key: command.name, text: command.description },
		...options(undefined, command.options),
		...subcommandsOf(command).flatMap((sub) => [
			{ key: stringKey(command.name, sub.name), text: sub.description },
			...options(sub.name, sub.options),
		]),
	];
}

export function menuStrings(menu: ContextMenu): CommandString[] {
	return [{ key: menuKey(menu), text: menu.name }];
}

export type CommandTranslations = Partial<Record<TranslatedLanguage, Readonly<Record<string, string>>>>;

/** Discord's localisation map for one string, or undefined when nothing is translated. */
export type Localise = (key: string) => Record<string, string> | undefined;

export function readCommandTranslations(): CommandTranslations {
	const found: CommandTranslations = {};
	for (const language of Object.keys(DISCORD_LOCALES) as TranslatedLanguage[]) {
		const file = assetPath("locales", "commands", `${language}.json`);
		if (existsSync(file)) found[language] = JSON.parse(readFileSync(file, "utf8")) as Record<string, string>;
	}
	return found;
}

export function localiserFor(translations: CommandTranslations): Localise {
	return (key) => {
		const entries = (Object.keys(DISCORD_LOCALES) as TranslatedLanguage[]).flatMap((language) => {
			const text = translations[language]?.[key];
			return typeof text === "string" && text !== ""
				? DISCORD_LOCALES[language].map((locale): [string, string] => [locale, text])
				: [];
		});
		return entries.length === 0 ? undefined : Object.fromEntries<string>(entries);
	};
}
