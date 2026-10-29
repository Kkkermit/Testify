import i18next from "i18next";
import { describe as describeError } from "@/app/ErrorState";
import { ApiError } from "@/lib/api";

function problem(status: number, code: string, message = "no"): ApiError {
	return new ApiError(status, { error: { code, message } });
}

/** Each of these is a different screen on purpose: "Something went wrong" for all four trains people to ignore the message. */
describe("describing a failure", () => {
	it("names the permission when the caller cannot manage the guild", () => {
		expect(describeError(problem(403, "missing_manage_guild"), i18next.t).body).toMatch(/manage server/i);
	});

	/** The rate limiter's own message says when to come back, so repeating it is better than replacing it. */
	it("passes the retry-after wording through, and offers a retry", () => {
		const described = describeError(problem(429, "rate_limited", "Try again in 30 seconds."), i18next.t);

		expect(described.body).toBe("Try again in 30 seconds.");
		expect(described.retryable).toBe(true);
	});

	/** A 500 might be transient; a 400 will not be, and offering a retry on one is a lie. */
	it("only offers a retry for a server-side failure", () => {
		expect(describeError(problem(500, "internal", "boom"), i18next.t).retryable).toBe(true);
		expect(describeError(problem(400, "invalid", "boom"), i18next.t).retryable).toBe(false);
	});
});
