import { ECONOMY } from "@config/constants";
import { planRobbery, ROBBERY_SCENES } from "@lib/economy/robbery.util";

const total = ROBBERY_SCENES.reduce((sum, rule) => sum + rule.weight, 0);

/** A roll that answers `first` for the scene and `rest` for everything after. */
function script(first: number, rest = 0): (max: number) => number {
	let calls = 0;
	return (max) => {
		calls += 1;
		return Math.min(max - 1, calls === 1 ? first : rest);
	};
}

describe("how a robbery goes", () => {
	/** The help article quotes the success chance, so the scenes have to add up to it exactly. */
	it("succeeds exactly as often as the help article says", () => {
		const successes = ROBBERY_SCENES.filter((rule) => rule.success).reduce((sum, rule) => sum + rule.weight, 0);

		expect(successes / total).toBeCloseTo(ECONOMY.robSuccessChance);
	});

	it("never fines more than the article's stated fine", () => {
		for (const rule of ROBBERY_SCENES) expect(rule.fine ?? 0).toBeLessThanOrEqual(ECONOMY.robFinePercent);
	});

	/** The embed has to say who was robbed and what it cost, so every line that moves money has to name the amount. */
	it("names the amount in every line of a scene that moves money", () => {
		for (const rule of ROBBERY_SCENES.filter((found) => found.take !== undefined || (found.fine ?? 0) > 0)) {
			for (const line of rule.lines) expect(line).toContain("{amount}");
		}
	});
});

describe("planning a robbery", () => {
	it("costs nothing when the robber simply walks away", () => {
		const slipped = ROBBERY_SCENES.findIndex((rule) => rule.scene === "slipped");
		const start = ROBBERY_SCENES.slice(0, slipped).reduce((sum, rule) => sum + rule.weight, 0);

		expect(planRobbery({ robber: 1_000, target: 5_000 }, script(start)).amount).toBe(0);
	});
});
