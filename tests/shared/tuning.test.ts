import { ECONOMY, LEVELLING } from "@config/constants";
import { atRate, DEFAULT_TUNING, tuningOf } from "@testify/shared";

describe("server tuning", () => {
	/** A server that never tuned anything must play by exactly the numbers the help articles quote. */
	it("defaults to the bot's own numbers", () => {
		expect(DEFAULT_TUNING.startingWallet).toBe(ECONOMY.startingWallet);
		expect(DEFAULT_TUNING.xpCooldownSeconds * 1_000).toBe(LEVELLING.messageCooldownMs);
		expect(tuningOf(null)).toEqual(DEFAULT_TUNING);
	});

	/** A record edited by hand, or written before a list changed, must not hand out a rate nobody chose. */
	it("reads anything a list does not offer as the default", () => {
		expect(tuningOf({ payRate: 1_000, startingWallet: -5, robbing: "yes", xpRate: 200, xpCooldownSeconds: 7 })).toEqual(
			{
				...DEFAULT_TUNING,
				xpRate: 200,
			},
		);
	});

	it("scales an amount, never to nothing", () => {
		expect([atRate(600, 50), atRate(1, 25), atRate(0, 300), atRate(150, 200)]).toEqual([300, 1, 0, 300]);
	});
});
