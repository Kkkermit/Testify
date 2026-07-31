/** The tints a lettered fallback avatar can take, over the `--color-feature-*` tokens in `index.css`. */
const TINTS = [
	"bg-feature-levelling/20 text-feature-levelling",
	"bg-feature-economy/20 text-feature-economy",
	"bg-feature-welcome/20 text-feature-welcome",
	"bg-feature-tickets/20 text-feature-tickets",
	"bg-feature-community/20 text-feature-community",
	"bg-feature-moderation/20 text-feature-moderation",
] as const;

/**
 * A stable colour per server, so the picker is scannable by shape rather than by reading every name — and the
 * same server keeps its colour between visits, which a random one would not.
 */
export function tintFor(seed: string): string {
	let hash = 0;
	for (const character of seed) hash = (hash * 31 + character.codePointAt(0)!) % 100_000;

	return TINTS[hash % TINTS.length] ?? TINTS[0];
}
