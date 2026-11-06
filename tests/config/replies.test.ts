import { BOT_LANGUAGES } from "@config/languages";
import { REPLIES, type ReplyKey } from "@config/replies";
import { eitherOf, languageOf, readerLanguage, say } from "@core/language";

const placeholders = (text: string): string => (text.match(/\{\w+\}/g) ?? []).sort().join();
const spans = (text: string): string => (text.match(/`[^`]+`/g) ?? []).sort().join();

describe("the replies in every language", () => {
	/** A placeholder spelled differently in one language is a reply showing `{name}` to the reader. */
	it("keeps every placeholder and code span the English has", () => {
		const broken = BOT_LANGUAGES.flatMap((language) =>
			(Object.keys(REPLIES.en) as ReplyKey[])
				.filter(
					(key) =>
						placeholders(REPLIES[language][key]) !== placeholders(REPLIES.en[key]) ||
						spans(REPLIES[language][key]) !== spans(REPLIES.en[key]),
				)
				.map((key) => `${language}: ${key}`),
		);

		expect(broken).toEqual([]);
	});

	it("fills a reply in, and leaves a placeholder nobody gave as it is", () => {
		expect(say("de", "cooldown", { time: "5s" })).toBe("Langsam — versuch es in 5s noch einmal.");
		expect(say("en", "maintenance")).toContain("`/{name}`");
	});
});

describe("which language a reader gets", () => {
	it("reads Discord's locales, Latin American Spanish and British English included, and falls back to English", () => {
		expect(["de", "es-419", "es-ES", "en-GB", "pt-BR", "ja", undefined, null, ""].map(languageOf)).toEqual([
			"de",
			"es",
			"es",
			"en",
			"en",
			"ja",
			"en",
			"en",
			"en",
		]);
	});

	/** A slash command carries the reader's own language; a prefix command only knows its server's. */
	it("prefers the reader's own locale to the server's", () => {
		expect(readerLanguage({ locale: "fr", guild: { preferredLocale: "de" } })).toBe("fr");
		expect(readerLanguage({ guild: { preferredLocale: "de" } })).toBe("de");
		expect(readerLanguage({ guild: null })).toBe("en");
	});

	it("joins a list with the language's own word for or", () => {
		expect(eitherOf("en", ["A", "B", "C"])).toBe("A, B or C");
		expect(eitherOf("de", ["A", "B"])).toBe("A oder B");
	});
});
