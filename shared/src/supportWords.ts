/** How a question and an article are broken into words: the vocabulary, the stemmer and the typo distance. */

const STOP_WORDS = new Set(
	(
		"a about after again all am an and any are as at be been being but by can could did do does doing done for from " +
		"get gets got had has have having he her here hers him his how i if in into is it its just me might my no not of " +
		"off on once only or other our out over please she should so some such than that the their them then there these " +
		"they this those through to too under until up us very was we were what when where which while who whom why will " +
		"with would you your yours yourself im ive dont doesnt cant cannot want need way thing things tell know let make " +
		"also still yet much many really help anything something someone somebody everyone anyone people isnt arent " +
		"wasnt werent didnt wont wouldnt couldnt shouldnt havent hasnt says said saying"
	).split(" "),
);

/** Words a reader uses for something the articles call by another name. */
export const ALSO_MEANS: Record<string, string[]> = {
	leveling: ["levelling"],
	levels: ["level"],
	lvl: ["level"],
	lvls: ["level"],
	xp: ["level"],
	exp: ["xp"],
	invite: ["add"],
	install: ["add"],
	website: ["dashboard"],
	site: ["dashboard"],
	web: ["dashboard"],
	perms: ["permission"],
	perm: ["permission"],
	cmd: ["command"],
	cmds: ["command"],
	song: ["music"],
	songs: ["music"],
	track: ["music"],
	tracks: ["music"],
	djs: ["dj"],
	timeout: ["mute"],
	coins: ["money"],
	coin: ["money"],
	cash: ["money"],
	currency: ["money"],
	mod: ["moderator"],
	mods: ["moderator"],
	pfp: ["avatar"],
	bal: ["balance"],
	lb: ["leaderboard"],
	color: ["colour"],
	authorize: ["authorise"],
	greeting: ["welcome"],
	greet: ["welcome"],
	emote: ["emoji"],
	emotes: ["emoji"],
	bday: ["birthday"],
};

/** Two-word phrases that mean one thing, joined before the split so both sides of a search agree on them. */
const PHRASES: [RegExp, string][] = [
	[/\bhow (?:do|does|can) (.+?) work\b/g, "$1 explainer"],
	[/\bwhat (?:can|does) (?:this|the|you|it)(?: bot)? do\b/g, "capabilities"],
	[/\bwho can\b/g, "permission"],
	[/\bdoes (?:it|the bot|that) say\b/g, "says"],
	[/\bturn(?:ing)? (?:it |this |the )?(\w+ )?(?:up|down)\b/g, "$1adjust"],
	[/\b(?:get|put|bring)(?:ting)? (?:the |this |your )?(?:bot|it) (?:in|into|on|onto|to)\b/g, "add bot"],
	[/\b(?:log|sign)(?:ging)? ?in\b/g, "login"],
	[/\b(?:log|sign)(?:ging)? ?out\b/g, "logout"],
	[/\b(?:turn|switch)(?:ing)? off\b/g, "disable"],
	[/\b(?:turn|switch)(?:ing)? on\b/g, "enable"],
	[/\bset(?:ting)? ?up\b/g, "setup"],
	[/\btim(?:e|ing) ?out\b/g, "timeout"],
	[/\bmissing permissions?\b/g, "missingpermission"],
];

/** Words whose stem would merge two features: the counting game is not a member count. */
const KEEP_WHOLE = new Set(["counting"]);

/** Suffixes off, then a doubled consonant and a final `e`, so "spamming", "banned" and "giving" meet their roots. */
export function stem(word: string): string {
	if (KEEP_WHOLE.has(word)) return word;
	let root = word;

	if (root.length >= 3 && root.endsWith("s") && !root.endsWith("ss")) root = root.slice(0, -1);
	if (root.length > 4 && root.endsWith("ie")) root = `${root.slice(0, -2)}y`;

	const suffix = ["ing", "ed"].find((ending) => root.length > ending.length + 2 && root.endsWith(ending));
	if (suffix !== undefined) {
		root = root.slice(0, -suffix.length);
		if (/([bcfgjklmnpqrtvwxz])\1$/.test(root)) root = root.slice(0, -1);
	}

	if (root.length > 3 && root.endsWith("e")) root = root.slice(0, -1);
	return root;
}

/** The words that carry meaning, before stemming: phrases joined, stop words, numbers and `ignore` dropped. */
export function wordsOf(text: string, ignore: readonly string[] = []): string[] {
	const phrased = PHRASES.reduce(
		(current, [pattern, replacement]) => current.replace(pattern, replacement),
		text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/['’]/g, ""),
	);

	return phrased
		.split(/[^\p{L}\p{N}]+/u)
		.filter((word) => word.length > 1 && !/^\d+$/.test(word) && !STOP_WORDS.has(word) && !ignore.includes(word));
}

export function tokenise(text: string, ignore: readonly string[] = []): string[] {
	return wordsOf(text, ignore).map(stem);
}

/** Optimal string alignment distance, giving up once it is certain to pass `max`. */
export function editDistance(a: string, b: string, max: number): number {
	if (Math.abs(a.length - b.length) > max) return max + 1;

	let before: number[] = [];
	let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

	for (let i = 1; i <= a.length; i += 1) {
		const current = [i];
		let best = i;

		for (let j = 1; j <= b.length; j += 1) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			let value = Math.min(
				(previous[j] ?? Infinity) + 1,
				(current[j - 1] ?? Infinity) + 1,
				(previous[j - 1] ?? Infinity) + cost,
			);
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
				value = Math.min(value, (before[j - 2] ?? Infinity) + 1);
			}
			current[j] = value;
			best = Math.min(best, value);
		}

		if (best > max) return max + 1;
		before = previous;
		previous = current;
	}

	return previous[b.length] ?? max + 1;
}
