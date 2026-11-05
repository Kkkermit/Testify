import { i18next, readableTag } from "@/i18n";

afterEach(async () => {
	await i18next.changeLanguage("en");
});

/** Chromium on a POSIX host reports `en-US@posix`, and an `Intl` formatter built from that throws. */
describe("a language tag the browser cannot format in", () => {
	it("is read as the tag it means", () => {
		const cases: [reported: string, read: string][] = [
			["en-US@posix", "en-US"],
			["de_DE", "de-DE"],
			["fr", "fr"],
			["", "en"],
			["not a tag", "en"],
		];

		expect(cases.filter(([reported, read]) => readableTag(reported) !== read)).toEqual([]);
	});

	it("still groups a count's digits, and marks the page with the language it is written in", async () => {
		await i18next.changeLanguage("en-US@posix");

		expect(i18next.t("common.memberCount", { count: 1234 })).toBe("1,234 members");
		expect(document.documentElement.lang).toBe("en");
	});
});
