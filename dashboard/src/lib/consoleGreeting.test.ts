import { i18next, type TranslationKey } from "@/i18n";
import { greetingLines, greetTheConsole } from "@/lib/consoleGreeting";

const PALETTE = { brand: "rebeccapurple", danger: "crimson" };
const t = (key: TranslationKey): string => i18next.t(key);

/** Each `%c` not written as `%%c`, which is a literal percent sign followed by a letter. */
function formatCodes(text: string): number {
	return text.replaceAll("%%", "").split("%c").length - 1;
}

let log: jest.SpiedFunction<typeof console.log>;

beforeEach(() => {
	log = jest.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => log.mockRestore());

describe("greetingLines", () => {
	/** A style with no `%c` to take it is printed as text, and a `%c` with no style swallows the next argument. */
	it("gives every styled run exactly one style", () => {
		for (const line of greetingLines(t, PALETTE)) expect(formatCodes(line.text)).toBe(line.styles.length);
	});

	/** Pasting a stranger's code into DevTools hands them a signed-in session on the dashboard. */
	it("warns against pasting code, under a label in the danger colour", () => {
		const lines = greetingLines(t, PALETTE);
		const stop = lines.findIndex((line) => line.text.includes(t("devConsole.stopTitle")));

		expect(stop).toBeGreaterThan(-1);
		expect(lines[stop]?.styles[0]).toContain("crimson");
		expect(lines.slice(stop).some((line) => line.text.includes(t("devConsole.stopLead")))).toBe(true);
	});

	it("escapes a percent sign so a name or a translation can never become a format code", () => {
		const lines = greetingLines(() => "100%cool", PALETTE);

		for (const line of lines) {
			expect(line.text).toContain("100%%cool");
			expect(formatCodes(line.text)).toBe(line.styles.length);
		}
	});
});

describe("greetTheConsole", () => {
	it("prints the greeting once the dictionary has loaded, with where the code lives", async () => {
		await greetTheConsole(Promise.resolve("https://github.com/example/bot"));

		const printed = log.mock.calls.map((call) => String(call[0]));
		expect(printed).toHaveLength(greetingLines(t, PALETTE, "the repository").length);
		expect(printed[0]).toContain(t("devConsole.title"));
		expect(printed.some((line) => line.includes("https://github.com/example/bot"))).toBe(true);
	});

	/** The greeting is a courtesy, so a site that will not answer, or answers with something odd, still gets the warning. */
	it("still warns, and prints no link, when the repository cannot be read or is not a web address", async () => {
		for (const repository of [null, "JaVaScRiPt:alert(1)", "https://x y"]) {
			log.mockClear();
			await greetTheConsole(Promise.resolve(repository));

			const printed = log.mock.calls.map((call) => String(call[0]));
			expect(printed.some((line) => line.includes(t("devConsole.stopTitle")))).toBe(true);
			expect(printed.some((line) => line.includes(t("devConsole.codeLead")))).toBe(false);
		}
	});
});
