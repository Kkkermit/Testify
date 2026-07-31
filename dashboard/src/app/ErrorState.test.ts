import { describe as describeError } from "@/app/ErrorState";
import { ApiError } from "@/lib/api";

function problem(status: number, code: string, message = "no"): ApiError {
	return new ApiError(status, { error: { code, message } });
}

/**
 * Each of these is a different screen on purpose. "Something went wrong" for all four is how a dashboard trains
 * people to ignore its error messages.
 */
describe("describing a failure", () => {
	it("tells someone the bot has left rather than that something broke", () => {
		expect(describeError(problem(404, "guild_not_found"))).toMatchObject({
			title: "Testify is not in that server",
			retryable: false,
		});
	});

	it("names the permission when the caller cannot manage the guild", () => {
		expect(describeError(problem(403, "missing_manage_guild")).body).toMatch(/manage server/i);
	});

	it("tells someone who left the server what happened", () => {
		expect(describeError(problem(403, "not_a_member")).title).toMatch(/not in that server/i);
	});

	/** The rate limiter's own message says when to come back, so repeating it is better than replacing it. */
	it("passes the retry-after wording through, and offers a retry", () => {
		const described = describeError(problem(429, "rate_limited", "Try again in 30 seconds."));

		expect(described.body).toBe("Try again in 30 seconds.");
		expect(described.retryable).toBe(true);
	});

	it("points a half-configured install at its setup steps", () => {
		expect(describeError(problem(503, "setup_required")).retryable).toBe(false);
	});

	/** A 500 might be transient; a 400 will not be, and offering a retry on one is a lie. */
	it("only offers a retry for a server-side failure", () => {
		expect(describeError(problem(500, "internal", "boom")).retryable).toBe(true);
		expect(describeError(problem(400, "invalid", "boom")).retryable).toBe(false);
	});

	it("copes with something that is not an API error at all", () => {
		expect(describeError(new TypeError("fetch failed"))).toMatchObject({ retryable: true });
	});
});
