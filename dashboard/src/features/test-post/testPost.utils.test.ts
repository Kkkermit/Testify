import { sendTestStatus } from "@/features/test-post/testPost.utils";
import { i18next } from "@/i18n";
import { ApiError } from "@/lib/api";

const t = i18next.getFixedT("en");
const refusal = (status: number, code: string, message = "Refused."): ApiError =>
	new ApiError(status, { error: { code, message } });

describe("sendTestStatus", () => {
	/** Each refusal the route can give is the reader's to fix, so each one says what to change rather than "failed". */
	it("words every outcome the route can answer with", () => {
		const cases: [string, Parameters<typeof sendTestStatus>, string | RegExp][] = [
			["before anything is pressed", ["idle", null, t], /^Only you get it/],
			["while it is on its way", ["pending", null, t], "Sending…"],
			["once Discord has it", ["success", null, t], "Sent to your direct messages."],
			["shut direct messages", ["error", refusal(403, "dm_closed"), t], /privacy settings/],
			["a reader not in the server", ["error", refusal(403, "not_a_member"), t], /not in this server/],
			[
				"too many in a minute",
				["error", refusal(429, "rate_limited"), t],
				"You can send 3 tests a minute. Try again shortly.",
			],
			[
				"a draft the server refused",
				["error", refusal(400, "invalid_body", "The message is too long."), t],
				"The message is too long.",
			],
			["the bot falling over", ["error", refusal(500, "internal"), t], /could not be sent/],
			["the network going", ["error", new TypeError("Failed to fetch"), t], /could not be sent/],
		];

		const wrong = cases.filter(([, args, expected]) => {
			const said = sendTestStatus(...args);
			return typeof expected === "string" ? said !== expected : !expected.test(said);
		});

		expect(wrong.map(([name]) => name)).toEqual([]);
	});
});
