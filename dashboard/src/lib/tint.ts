const TINTS = [
	"bg-hue-violet/20 text-hue-violet",
	"bg-hue-amber/20 text-hue-amber",
	"bg-hue-green/20 text-hue-green",
	"bg-hue-blue/20 text-hue-blue",
	"bg-hue-pink/20 text-hue-pink",
	"bg-hue-red/20 text-hue-red",
] as const;

export function tintFor(seed: string): string {
	let hash = 0;
	for (const character of seed) hash = (hash * 31 + character.codePointAt(0)!) % 100_000;

	return TINTS[hash % TINTS.length] ?? TINTS[0];
}
