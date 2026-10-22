import { currentBotName, i18next, type TranslationKey } from "@/i18n";
import { greetingLines, greetTheConsole, printGreeting } from "@/lib/consoleGreeting";

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

	it("welcomes the reader by the bot's name and says how to report a bug", () => {
		const text = greetingLines(t, PALETTE)
			.map((line) => line.text)
			.join("\n");

		expect(text).toContain(currentBotName());
		expect(text).toContain("/bug-report");
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

describe("printGreeting", () => {
	it("writes each line with its styles", () => {
		const lines = greetingLines(t, PALETTE);
		printGreeting(lines);

		expect(log).toHaveBeenCalledTimes(lines.length);
		expect(log).toHaveBeenNthCalledWith(1, lines[0]?.text, ...(lines[0]?.styles ?? []));
	});
});

describe("greetTheConsole", () => {
	it("prints the greeting once the dictionary has loaded", () => {
		greetTheConsole();

		expect(log).toHaveBeenCalledTimes(greetingLines(t, PALETTE).length);
		expect(String(log.mock.calls[0]?.[0])).toContain(t("devConsole.title"));
	});
});
