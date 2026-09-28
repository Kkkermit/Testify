import { ECONOMY } from "@config/constants";
import { pickScene, planRobbery, ROBBERY_SCENES } from "@lib/economy/robbery.util";

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

	it("has several ways to succeed and several ways to fail, each with its own words", () => {
		expect(ROBBERY_SCENES.filter((rule) => rule.success).length).toBeGreaterThanOrEqual(4);
		expect(ROBBERY_SCENES.filter((rule) => !rule.success).length).toBeGreaterThanOrEqual(5);
		for (const rule of ROBBERY_SCENES) {
			expect(rule.lines.length).toBeGreaterThan(0);
			for (const line of rule.lines) expect(line).toContain("{target}");
		}
	});

	/** The embed has to say who was robbed and what it cost, so every line that moves money has to name the amount. */
	it("names the amount in every line of a scene that moves money", () => {
		for (const rule of ROBBERY_SCENES.filter((found) => found.take !== undefined || (found.fine ?? 0) > 0)) {
			for (const line of rule.lines) expect(line).toContain("{amount}");
		}
	});

	it("reaches every scene, and only by its own weight", () => {
		const seen = new Map<string, number>();
		for (let point = 0; point < total; point += 1) {
			const scene = pickScene(() => point).scene;
			seen.set(scene, (seen.get(scene) ?? 0) + 1);
		}

		expect(Object.fromEntries(seen)).toEqual(
			Object.fromEntries(ROBBERY_SCENES.map((rule) => [rule.scene, rule.weight])),
		);
	});
});

describe("planning a robbery", () => {
	it("takes a share of the target's wallet inside the scene's range", () => {
		const pickpocket = ROBBERY_SCENES.findIndex((rule) => rule.scene === "pickpocket");
		const start = ROBBERY_SCENES.slice(0, pickpocket).reduce((sum, rule) => sum + rule.weight, 0);

		expect(planRobbery({ robber: 0, target: 10_000 }, script(start, 0)).amount).toBe(500);
		expect(planRobbery({ robber: 0, target: 10_000 }, script(start, 10_000)).amount).toBe(1_500);
	});

	it("always takes at least one coin on a success", () => {
		expect(planRobbery({ robber: 0, target: 1 }, script(0)).amount).toBe(1);
	});

	it("fines a share of the robber's own wallet when caught", () => {
		const caught = ROBBERY_SCENES.findIndex((rule) => rule.scene === "caught");
		const start = ROBBERY_SCENES.slice(0, caught).reduce((sum, rule) => sum + rule.weight, 0);
		const plan = planRobbery({ robber: 1_000, target: 5_000 }, script(start));

		expect(plan.rule.success).toBe(false);
		expect(plan.amount).toBe(Math.floor(1_000 * ECONOMY.robFinePercent));
	});

	it("costs nothing when the robber simply walks away", () => {
		const slipped = ROBBERY_SCENES.findIndex((rule) => rule.scene === "slipped");
		const start = ROBBERY_SCENES.slice(0, slipped).reduce((sum, rule) => sum + rule.weight, 0);

		expect(planRobbery({ robber: 1_000, target: 5_000 }, script(start)).amount).toBe(0);
	});
});
