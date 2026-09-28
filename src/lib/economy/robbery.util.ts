import { randomInt } from "node:crypto";
import { ECONOMY } from "@config/constants";

/** How a robbery goes, as pure rules: which scene plays, what it says and how much money moves. */

type Roll = (max: number) => number;

export type RobberyScene =
	"pickpocket" | "clean" | "jackpot" | "scraps" | "caught" | "fought" | "dog" | "slipped" | "dropped";

export interface SceneRule {
	scene: RobberyScene;
	success: boolean;
	/** Out of 100; the successes add up to `ECONOMY.robSuccessChance`. */
	weight: number;
	/** A success takes this share of the target's wallet, from the first figure to the second. */
	take?: readonly [number, number];
	/** A failure costs this share of the robber's own wallet. */
	fine?: number;
	/** Whether a fine goes to the person they tried to rob, rather than vanishing. */
	toTarget?: boolean;
	/** `{target}` and `{amount}` are filled in. */
	lines: readonly string[];
}

export const ROBBERY_SCENES: readonly SceneRule[] = [
	{
		scene: "pickpocket",
		success: true,
		weight: 18,
		take: [0.05, 0.15],
		lines: [
			"You brushed past {target} in the crowd and walked off **{amount}** richer.",
			"A quick hand in {target}'s pocket, and **{amount}** is yours.",
			"{target} never felt a thing. You lifted **{amount}**.",
		],
	},
	{
		scene: "clean",
		success: true,
		weight: 16,
		take: [0.15, 0.3],
		lines: [
			"A clean job. You slipped away from {target} with **{amount}**.",
			"You waited for {target} to look away and took **{amount}**.",
			"In and out before {target} noticed. **{amount}** stolen.",
		],
	},
	{
		scene: "jackpot",
		success: true,
		weight: 4,
		take: [0.3, 0.45],
		lines: [
			"Jackpot! {target} was carrying a fat wallet, and **{amount}** of it is now yours.",
			"{target} left their wallet wide open. You cleared out **{amount}**.",
		],
	},
	{
		scene: "scraps",
		success: true,
		weight: 2,
		take: [0.01, 0.05],
		lines: [
			"You got away, but only with **{amount}** of {target}'s loose change.",
			"{target} spotted you at the last second. You escaped with just **{amount}**.",
		],
	},
	{
		scene: "caught",
		success: false,
		weight: 20,
		fine: ECONOMY.robFinePercent,
		lines: [
			"The police caught you going through {target}'s pockets. You were fined **{amount}**.",
			"{target} called for help and a guard grabbed you. That cost you **{amount}** in fines.",
			"Caught on camera robbing {target}. The fine is **{amount}**.",
		],
	},
	{
		scene: "fought",
		success: false,
		weight: 12,
		fine: 0.1,
		toTarget: true,
		lines: [
			"{target} fought back and took **{amount}** off you instead.",
			"You picked the wrong target. {target} turned the tables and robbed you of **{amount}**.",
		],
	},
	{
		scene: "dog",
		success: false,
		weight: 8,
		fine: 0.08,
		lines: [
			"{target}'s guard dog chased you down the street. Patching yourself up cost **{amount}**.",
			"A dog you did not see coming bit you while you went for {target}. The doctor charged **{amount}**.",
		],
	},
	{
		scene: "slipped",
		success: false,
		weight: 12,
		lines: [
			"You tripped over your own feet and {target} walked off. You got nothing, but lost nothing either.",
			"{target} crossed the road before you could get close. Empty-handed this time.",
			"You lost your nerve at the last moment and left {target} alone.",
		],
	},
	{
		scene: "dropped",
		success: false,
		weight: 8,
		lines: [
			"You grabbed {target}'s wallet, then dropped it running away. Nothing gained.",
			"{target}'s wallet was empty apart from receipts. You threw it back.",
		],
	},
];

export interface RobberyPlan {
	rule: SceneRule;
	/** What was taken on a success, or lost on a failure; zero when nothing moved. */
	amount: number;
	/** The scene's line, with `{target}` and `{amount}` left for the caller to fill in. */
	line: string;
}

export function pickScene(roll: Roll = randomInt): SceneRule {
	const total = ROBBERY_SCENES.reduce((sum, rule) => sum + rule.weight, 0);
	let point = roll(total);

	for (const rule of ROBBERY_SCENES) {
		if (point < rule.weight) return rule;
		point -= rule.weight;
	}
	return ROBBERY_SCENES[0]!;
}

/** Decides the robbery; the caller moves the money and fills in `{target}` and `{amount}`. */
export function planRobbery(wallets: { robber: number; target: number }, roll: Roll = randomInt): RobberyPlan {
	const rule = pickScene(roll);
	const line = rule.lines[roll(rule.lines.length)]!;

	if (rule.take !== undefined) {
		const [low, high] = rule.take;
		const least = Math.max(1, Math.floor(wallets.target * low));
		const most = Math.max(least, Math.floor(wallets.target * high));
		return { rule, amount: least + roll(most - least + 1), line };
	}

	return { rule, amount: Math.floor(wallets.robber * (rule.fine ?? 0)), line };
}
