import { randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { dataPath } from "@core/paths";

/** The joke `/fun hack` report: every value is invented, and some are impossible on purpose. */

const hackDataSchema = z.object({
	passwords: z.array(z.string().min(1)).min(1),
	ipAddresses: z.array(z.string().min(1)).min(1),
	wifi: z.array(z.object({ name: z.string().min(1), password: z.string().min(1) })).min(1),
	addresses: z.array(z.string().min(1)).min(1),
	birthdays: z.array(z.string().min(1)).min(1),
	cards: z.array(z.object({ number: z.string().min(1), expiry: z.string().min(1), cvv: z.string().min(1) })).min(1),
	searches: z.array(z.string().min(1)).min(1),
});

export type HackData = z.infer<typeof hackDataSchema>;

let cached: HackData | undefined;

export function hackData(): HackData {
	cached ??= hackDataSchema.parse(JSON.parse(readFileSync(dataPath("hackUsers.json"), "utf8")));
	return cached;
}

export const HACK_STAGES = [
	"💻 Getting the process ready…",
	"📦 Installing the payload on their devices…",
	"🔑 Recovering device passwords…",
	"📡 Breaking into their Wi-Fi…",
	"💳 Locating their mum’s credit card…",
	"🔍 Reading their search history…",
	"☁️ Uploading everything to the cloud…",
] as const;

/** An upper bound, exclusive, like `crypto.randomInt`; injected so a test can choose each value. */
export type Roll = (max: number) => number;

function pick<T>(values: readonly T[], roll: Roll): T {
	return values[roll(values.length)]!;
}

export interface HackField {
	name: string;
	value: string;
	inline?: boolean;
}

export function hackFields(username: string, data: HackData, roll: Roll = randomInt): HackField[] {
	const wifi = pick(data.wifi, roll);
	const card = pick(data.cards, roll);

	return [
		{ name: "Password", value: `\`${pick(data.passwords, roll).replaceAll("{name}", username)}\``, inline: true },
		{ name: "IP address", value: `\`${pick(data.ipAddresses, roll)}\``, inline: true },
		{ name: "Email", value: `\`${username}${String(10 + roll(90))}@example.com\``, inline: true },
		{ name: "Wi-Fi", value: `\`${wifi.name}\` · password \`${wifi.password}\`` },
		{ name: "Home address", value: pick(data.addresses, roll) },
		{ name: "Date of birth", value: pick(data.birthdays, roll), inline: true },
		{ name: "Card", value: `\`${card.number}\` · expires ${card.expiry} · CVV ${card.cvv}` },
		{ name: "Last search", value: `“${pick(data.searches, roll)}”` },
	];
}

/** `step` of `total` as a bar and a percentage, which is what makes the wait read as progress. */
export function hackProgress(step: number, total: number, width = 12): string {
	const ratio = total <= 0 ? 1 : Math.min(1, Math.max(0, step / total));
	const filled = Math.round(ratio * width);

	return `\`[${"█".repeat(filled)}${"░".repeat(width - filled)}]\` ${String(Math.round(ratio * 100))}%`;
}
