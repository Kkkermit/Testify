import { markupWarning, sanitiseInput } from "@/lib/sanitise";

/**
 * A sanitiser run over a raw Discord message destroys it: `<@123>` comes back entity-encoded, `<a:name:id>`
 * parses as an anchor and `<t:…>` as an unknown tag, so both are deleted outright. Each of these was measured
 * against `dompurify` before the placeholder pass was written, and each is a bug if it regresses.
 */
describe("sanitiseInput", () => {
	it.each([
		["a user mention", "Welcome <@123456789012345678>!"],
		["a legacy user mention", "Hi <@!123456789012345678>"],
		["a role mention", "You are <@&123456789012345678>"],
		["a channel mention", "Read <#123456789012345678>"],
		["a custom emoji", "Nice <:party:123456789012345678>"],
		["an animated emoji", "Nice <a:party:123456789012345678>"],
		["a timestamp", "Starts <t:1700000000:R>"],
		["a bare timestamp", "At <t:1700000000>"],
		["a slash command mention", "Try </pet rehome:123456789012345678>"],
	])("leaves %s untouched", (_name, value) => {
		expect(sanitiseInput(value)).toBe(value);
	});

	it("keeps the placeholder tokens a welcome template is written with", () => {
		expect(sanitiseInput("{user} joined {server}, count {count}")).toBe("{user} joined {server}, count {count}");
	});

	it("strips a script tag and its contents", () => {
		expect(sanitiseInput("<script>alert(1)</script>Hello")).toBe("Hello");
	});

	it("strips an event handler that never reaches a parser as text", () => {
		expect(sanitiseInput("<img src=x onerror=alert(1)>")).toBe("");
	});

	it("keeps the text inside a formatting tag it removes", () => {
		expect(sanitiseInput("Hi <b>there</b>")).toBe("Hi there");
	});

	/** Entity-encoding this would show the reader `5 &lt; 10` in Discord, which is not what they typed. */
	it("leaves a bare less-than as a character", () => {
		expect(sanitiseInput("5 < 10 and 10 > 5")).toBe("5 < 10 and 10 > 5");
		expect(sanitiseInput("Tom & Jerry")).toBe("Tom & Jerry");
	});

	/** The one decode must not turn an already-encoded payload back into a live tag. */
	it("does not revive a double-encoded script tag", () => {
		const out = sanitiseInput("&lt;script&gt;alert(1)&lt;/script&gt;");
		expect(out).not.toContain("<script");
	});

	it("survives a value that is only markup", () => {
		expect(sanitiseInput("<div><span></span></div>")).toBe("");
	});

	it("cannot be fooled by a hand-typed placeholder sentinel", () => {
		expect(sanitiseInput("0 plain")).not.toContain("<");
	});
});

describe("markupWarning", () => {
	it("says nothing about a message that is only Discord syntax", () => {
		expect(markupWarning("Welcome <@123456789012345678> to <#123456789012345678>")).toBeNull();
	});

	it("warns about a real tag", () => {
		expect(markupWarning("Hi <b>there</b>")).toMatch(/HTML/);
	});
});
