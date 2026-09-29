import { cookiesLineFor } from "../../scripts/cookiesLine";
import { cookieFileText } from "@lib/music/musicBinaries.util";

const EXPORTED = "# Netscape HTTP Cookie File\r\n.youtube.com\tTRUE\t/\tTRUE\t0\tSID\tabc\r\n";

describe("cookiesLineFor", () => {
	/** Railway's variable box takes one line, which is why the script exists. */
	it("turns an exported file into a single line with no spaces", () => {
		const result = cookiesLineFor(EXPORTED);

		expect("line" in result && result.line).toMatch(/^[A-Za-z0-9+/=]+$/);
	});

	it("gives a line the bot reads back into the same file", () => {
		const result = cookiesLineFor(EXPORTED);
		if (!("line" in result)) throw new Error("expected a line");

		expect(cookieFileText(result.line)).toBe("# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t0\tSID\tabc\n");
	});

	it("refuses a file that is not a cookies export", () => {
		expect(cookiesLineFor("SID=abc; HSID=def")).toHaveProperty("problem");
	});
});
