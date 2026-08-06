import { containsMarkup, welcomePatchSchema, withoutDiscordTokens } from "@testify/shared";

/**
 * The server-side half of the DOMPurify pass: the browser strips markup, and this refuses it, so a request
 * that never touches the page is refused just the same. Discord's own syntax has to survive both.
 */
describe("containsMarkup", () => {
	it.each([
		["a user mention", "Welcome <@123456789012345678>"],
		["a legacy user mention", "Hi <@!123456789012345678>"],
		["a role mention", "You are <@&123456789012345678>"],
		["a channel mention", "Read <#123456789012345678>"],
		["a custom emoji", "<:party:123456789012345678>"],
		["an animated emoji", "<a:party:123456789012345678>"],
		["a timestamp with a style", "<t:1700000000:R>"],
		["a bare timestamp", "<t:1700000000>"],
		["a slash command mention", "</pet rehome:123456789012345678>"],
		["a guild navigation link", "<id:customize>"],
		["a bare comparison", "5 < 10"],
		["an emoticon", "<3 you"],
	])("allows %s", (_name, value) => {
		expect(containsMarkup(value)).toBe(false);
	});

	it.each([
		["a script tag", "<script>alert(1)</script>"],
		["an image with a handler", "<img src=x onerror=alert(1)>"],
		["a formatting tag", "Hi <b>there</b>"],
		["a closing tag on its own", "</div>"],
		["a comment", "<!-- hidden -->"],
		["an anchor", "<a href='https://evil.example'>click</a>"],
	])("refuses %s", (_name, value) => {
		expect(containsMarkup(value)).toBe(true);
	});

	/** An id one digit short of a snowflake is not a mention, so it must not buy a tag its way through. */
	it("does not treat a malformed mention as Discord syntax", () => {
		expect(withoutDiscordTokens("<@123>")).toBe("<@123>");
	});
});

describe("the schemas that carry free text", () => {
	it("refuses a welcome message containing a tag", () => {
		const result = welcomePatchSchema.safeParse({ message: "Welcome <script>alert(1)</script>" });
		expect(result.success).toBe(false);
	});

	it("accepts a welcome message that is only Discord syntax", () => {
		const parsed = welcomePatchSchema.parse({
			message: "Welcome <@123456789012345678> to <#123456789012345678>! <a:wave:123456789012345678>",
		});
		expect(parsed.message).toContain("<a:wave:123456789012345678>");
	});
});
