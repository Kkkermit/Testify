import { guildIdParam, pagination, returnTo, snowflake } from "@testify/shared";

describe("snowflake", () => {
	it("accepts a Discord ID", () => {
		expect(snowflake.safeParse("123456789012345678").success).toBe(true);
	});

	it("rejects anything that is not one", () => {
		for (const value of ["", "abc", "12345", "1".repeat(21), "12345678901234567 ", "-123456789012345678"]) {
			expect(snowflake.safeParse(value).success).toBe(false);
		}
	});

	/** A snowflake that reaches Mongo as an operator rather than a string is how a filter gets rewritten. */
	it("rejects an object pretending to be one", () => {
		expect(snowflake.safeParse({ $ne: null }).success).toBe(false);
		expect(guildIdParam.safeParse({ guildId: { $gt: "" } }).success).toBe(false);
	});
});

describe("returnTo", () => {
	it("accepts a path on this site", () => {
		for (const path of ["/", "/guilds", "/guilds/123/levelling", "/a_b-c"]) {
			expect(returnTo.safeParse(path).success).toBe(true);
		}
	});

	/** The query string the sign-in flow carries is accepted. */
	it("accepts the query string the sign-in flow carries", () => {
		for (const path of [
			"/owner?tab=logs",
			"/guilds/123/levelling?tab=rewards",
			"/guilds/123/members?board=levels&page=2",
			"/commands?q=ban",
			"/x?a=b%20c",
		]) {
			expect(returnTo.safeParse(path).success).toBe(true);
		}
	});

	/** A fragment never reaches the server, so allowing one would only widen what has to be checked. */
	it("rejects a fragment", () => {
		expect(returnTo.safeParse("/guilds#frag").success).toBe(false);
	});

	/** A nested `returnTo` carrying a protocol-relative URL is refused. */
	it("refuses a protocol-relative URL smuggled through a nested returnTo", () => {
		const outer = "/sign-in?returnTo=%2F%2Fevil.example";
		expect(returnTo.safeParse(outer).success).toBe(true);

		const inner = decodeURIComponent(new URLSearchParams(outer.split("?")[1]).get("returnTo") ?? "");
		expect(returnTo.safeParse(inner).success).toBe(false);
	});

	it("rejects a protocol-relative URL", () => {
		expect(returnTo.safeParse("//evil").success).toBe(false);
		expect(returnTo.safeParse("//evil/path").success).toBe(false);
		expect(returnTo.safeParse("///evil").success).toBe(false);
	});

	it("rejects an absolute URL", () => {
		for (const value of ["https://evil.example", "http://evil.example", "javascript:alert(1)", "data:text/html,x"]) {
			expect(returnTo.safeParse(value).success).toBe(false);
		}
	});

	/** Browsers normalise a backslash to a slash, so `/\evil` becomes `//evil`. */
	it("rejects backslashes", () => {
		expect(returnTo.safeParse("/\\evil").success).toBe(false);
		expect(returnTo.safeParse("\\\\evil").success).toBe(false);
	});

	it("rejects a path that does not start at the root", () => {
		expect(returnTo.safeParse("guilds").success).toBe(false);
		expect(returnTo.safeParse("").success).toBe(false);
	});

	it("rejects a path long enough to be a payload", () => {
		expect(returnTo.safeParse(`/${"a".repeat(600)}`).success).toBe(false);
	});
});

describe("pagination", () => {
	it("fills in sensible defaults", () => {
		expect(pagination.parse({})).toEqual({ page: 1, perPage: 25 });
	});

	it("reads the numbers out of a query string", () => {
		expect(pagination.parse({ page: "3", perPage: "10" })).toEqual({ page: 3, perPage: 10 });
	});

	/** Page zero becomes a negative skip, and an unbounded perPage is an unbounded Mongo scan. */
	it("refuses values that would turn into a bad query", () => {
		expect(pagination.safeParse({ page: 0 }).success).toBe(false);
		expect(pagination.safeParse({ page: -1 }).success).toBe(false);
		expect(pagination.safeParse({ perPage: 5_000 }).success).toBe(false);
		expect(pagination.safeParse({ page: "not a number" }).success).toBe(false);
	});
});
