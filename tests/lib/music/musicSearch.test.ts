import { CHOICE_MAX } from "@lib/music/music.constants";
import { type Track } from "@lib/music/music.types";
import {
	type Choice,
	INTERACTION_WINDOW_MS,
	interactionAge,
	Keystrokes,
	choiceFor,
	choicesFor,
	literalChoice,
	MAX_CHOICES,
	RESPONSE_MARGIN_MS,
	searchBudget,
	SearchCache,
	shouldSearch,
	stillOpen,
	Suggester,
	within,
} from "@lib/music/musicSearch.util";

function track(overrides: Partial<Track> = {}): Track {
	return {
		url: "https://youtu.be/dQw4w9WgXcQ",
		title: "A Song",
		author: "An Artist",
		durationMs: 187_000,
		thumbnail: null,
		source: "youtube",
		requestedBy: "100000000000000001",
		...overrides,
	};
}

describe("choiceFor", () => {
	it("shows the title, the artist and the length", () => {
		expect(choiceFor(track())).toEqual({ name: "A Song · An Artist (3:07)", value: "https://youtu.be/dQw4w9WgXcQ" });
	});

	/** Discord refuses the whole response if any name is over 100, so one long title must not lose the lot. */
	it("keeps the name within Discord's limit", () => {
		const choice = choiceFor(track({ title: "x".repeat(300) }));

		expect(choice?.name.length).toBeLessThanOrEqual(CHOICE_MAX);
	});

	/** A track whose address will not fit is dropped rather than offered truncated. */
	it("drops a track whose address will not fit", () => {
		expect(choiceFor(track({ url: `https://example.com/${"x".repeat(CHOICE_MAX)}` }))).toBeNull();
	});

	it("says live rather than printing a wrong length", () => {
		expect(choiceFor(track({ durationMs: null }))?.name).toContain("live");
	});

	it("omits the artist when there is not one", () => {
		expect(choiceFor(track({ author: null }))?.name).toBe("A Song (3:07)");
	});
});

describe("choicesFor", () => {
	it("never offers more than Discord accepts", () => {
		const many = Array.from({ length: 40 }, (_, at) => track({ title: `Song ${String(at)}` }));

		expect(choicesFor(many)).toHaveLength(MAX_CHOICES);
	});

	it("skips the unusable ones without dropping the rest", () => {
		const mixed = [track({ url: `https://e.test/${"x".repeat(200)}` }), track({ title: "Fine" })];

		expect(choicesFor(mixed)).toHaveLength(1);
	});
});

describe("literalChoice", () => {
	it("always leaves a way to press enter", () => {
		expect(literalChoice("lofi")).toEqual({ name: "Search for “lofi”", value: "lofi" });
	});

	it("keeps a very long query inside the limit", () => {
		const choice = literalChoice("x".repeat(400));

		expect(choice.name.length).toBeLessThanOrEqual(CHOICE_MAX);
		expect(choice.value.length).toBeLessThanOrEqual(CHOICE_MAX);
	});
});

describe("shouldSearch", () => {
	it.each(["", " ", "a", "ab", "  ab  "])("does not search for %p", (query) => {
		expect(shouldSearch(query)).toBe(false);
	});

	it("searches once there is enough to go on", () => {
		expect(shouldSearch("abc")).toBe(true);
	});
});

describe("SearchCache", () => {
	const choices = [{ name: "A Song", value: "https://youtu.be/a" }];

	it("answers a repeated query without another lookup", () => {
		const cache = new SearchCache();
		cache.set("lofi", choices, 0);

		expect(cache.get("lofi", 100)).toEqual(choices);
	});

	/** Autocomplete fires per keystroke, and case or spacing changes must not miss a warm entry. */
	it("ignores case and surrounding space", () => {
		const cache = new SearchCache();
		cache.set("LoFi ", choices, 0);

		expect(cache.get(" lofi", 100)).toEqual(choices);
	});

	it("forgets an entry once it is stale", () => {
		const cache = new SearchCache(1_000);
		cache.set("lofi", choices, 0);

		expect(cache.get("lofi", 5_000)).toBeNull();
	});

	it("misses a query it has never seen", () => {
		expect(new SearchCache().get("nothing")).toBeNull();
	});

	/** Unbounded, this would grow for as long as the process lives — the same leak the rate limiter avoids. */
	it("never grows past its limit", () => {
		const cache = new SearchCache(60_000, 3);

		for (const query of ["a1", "b2", "c3", "d4", "e5"]) cache.set(query, choices, 0);

		expect(cache.size).toBe(3);
	});

	it("evicts what was used longest ago rather than what was added first", () => {
		const cache = new SearchCache(60_000, 2);
		cache.set("first", choices, 0);
		cache.set("second", choices, 0);

		// Touching "first" should make "second" the next to go.
		cache.get("first", 10);
		cache.set("third", choices, 10);

		expect(cache.get("first", 20)).toEqual(choices);
		expect(cache.get("second", 20)).toBeNull();
	});
});

describe("within", () => {
	it("hands back the answer when it arrives in time", async () => {
		await expect(within(Promise.resolve("done"), 200)).resolves.toBe("done");
	});

	it("gives up rather than waiting for a slow answer", async () => {
		const slow = new Promise((resolve) => setTimeout(() => resolve("late"), 200));

		await expect(within(slow, 20)).resolves.toBeNull();
	});
});

describe("Suggester", () => {
	const choice = (name: string): Choice => ({ name, value: `https://youtu.be/${name}` });

	/** Autocomplete answers inside its budget even when the search never finishes. */
	it("answers inside its budget even when the search never finishes", async () => {
		const suggester = new Suggester(20);
		const never = new Promise<Choice[]>(() => undefined);

		const answered = await suggester.suggest("something", () => never);

		expect(answered).toEqual([literalChoice("something")]);
	});

	it("uses the results when the search beats the budget", async () => {
		const suggester = new Suggester(500);

		await expect(suggester.suggest("song", () => Promise.resolve([choice("a")]))).resolves.toEqual([choice("a")]);
	});

	/** A slow search still pays for itself: it is what the next keystroke reads instead of searching again. */
	it("fills the cache from a search that finished too late to be used", async () => {
		const suggester = new Suggester(20);
		let settle: (choices: Choice[]) => void = () => undefined;
		const slow = new Promise<Choice[]>((resolve) => (settle = resolve));

		expect(await suggester.suggest("song", () => slow)).toEqual([literalChoice("song")]);

		settle([choice("a")]);
		await new Promise((resolve) => setImmediate(resolve));

		expect(await suggester.suggest("song", () => Promise.reject(new Error("must not run")))).toEqual([choice("a")]);
	});

	it("runs one search for a burst of keystrokes on the same text", async () => {
		const suggester = new Suggester(20);
		const search = jest.fn(() => new Promise<Choice[]>(() => undefined));

		await Promise.all([suggester.suggest("song", search), suggester.suggest("SONG ", search)]);

		expect(search).toHaveBeenCalledTimes(1);
		expect(suggester.pending).toBe(1);
	});

	it("still offers a way to press enter when the search fails", async () => {
		const suggester = new Suggester(200);

		await expect(suggester.suggest("song", () => Promise.reject(new Error("yt-dlp died")))).resolves.toEqual([
			literalChoice("song"),
		]);
	});

	/** Caching a failure would leave a broken answer in place for the whole five minutes. */
	it("does not cache a failed search", async () => {
		const suggester = new Suggester(200);

		await suggester.suggest("song", () => Promise.reject(new Error("yt-dlp died")));

		await expect(suggester.suggest("song", () => Promise.resolve([choice("a")]))).resolves.toEqual([choice("a")]);
	});

	/** An empty answer is worth caching, but it must not leave the reader with no row to pick. */
	it("offers the literal row for a cached search that found nothing", async () => {
		const suggester = new Suggester(200);

		await suggester.suggest("song", () => Promise.resolve([]));

		await expect(suggester.suggest("song", () => Promise.reject(new Error("must not run")))).resolves.toEqual([
			literalChoice("song"),
		]);
	});

	/** On a host where every search outruns the window, songs only ever appeared if the typing stopped dead. */
	it("shows what the shorter text found while the longer search is still running", async () => {
		const suggester = new Suggester(20);
		await suggester.suggest("bush", () => Promise.resolve([choice("bush-song")]));

		const answered = await suggester.suggest("bushido", () => new Promise<Choice[]>(() => undefined));

		expect(answered).toEqual([literalChoice("bushido"), choice("bush-song")]);
	});

	it("takes the longest earlier text, not the first one cached", async () => {
		const suggester = new Suggester(20);
		await suggester.suggest("bus", () => Promise.resolve([choice("bus")]));
		await suggester.suggest("bushi", () => Promise.resolve([choice("bushi")]));

		const answered = await suggester.suggest("bushido", () => new Promise<Choice[]>(() => undefined));

		expect(answered).toEqual([literalChoice("bushido"), choice("bushi")]);
	});

	it("never borrows results from text this one does not extend", async () => {
		const suggester = new Suggester(20);
		await suggester.suggest("drake", () => Promise.resolve([choice("drake")]));

		expect(await suggester.suggest("bushido", () => new Promise<Choice[]>(() => undefined))).toEqual([
			literalChoice("bushido"),
		]);
	});

	it("never offers more rows than Discord accepts", async () => {
		const suggester = new Suggester(200);
		const many = Array.from({ length: 40 }, (_, at) => choice(`t${String(at)}`));

		await expect(suggester.suggest("song", () => Promise.resolve(many))).resolves.toHaveLength(MAX_CHOICES);
	});
});

describe("the interaction's own clock", () => {
	const CREATED = 1_000_000;

	it("measures from the snowflake when the two clocks agree", () => {
		expect(interactionAge(CREATED, CREATED + 200, CREATED + 900)).toBe(900);
	});

	/** A host clock behind Discord's falls back to the receipt time, so the window is not overrun. */
	it("falls back to its own receipt when the host clock is wrong", () => {
		const skewed = CREATED + 60_000;

		expect(interactionAge(skewed, CREATED, CREATED + 400)).toBe(400);
	});

	it("takes the longer of the two rather than the flattering one", () => {
		expect(interactionAge(CREATED, CREATED + 1_500, CREATED + 2_000)).toBe(2_000);
	});

	it("leaves room for the answer to travel", () => {
		expect(searchBudget(0)).toBe(INTERACTION_WINDOW_MS - RESPONSE_MARGIN_MS);
	});

	it("gives a search nothing at all once the window is nearly gone", () => {
		expect(searchBudget(INTERACTION_WINDOW_MS)).toBe(0);
	});

	it("knows when there is no point answering", () => {
		expect(stillOpen(INTERACTION_WINDOW_MS - 1)).toBe(true);
		expect(stillOpen(INTERACTION_WINDOW_MS)).toBe(false);
	});
});

describe("Keystrokes", () => {
	it("knows only the newest keystroke is worth answering", () => {
		const keys = new Keystrokes();
		keys.begin("guild:user", "1");
		keys.begin("guild:user", "2");

		expect(keys.isLatest("guild:user", "1")).toBe(false);
		expect(keys.isLatest("guild:user", "2")).toBe(true);
	});

	/** An older keystroke finishing late must not clear the one still waiting on its answer. */
	it("forgets somebody only when their newest keystroke is answered", () => {
		const keys = new Keystrokes();
		keys.begin("guild:user", "1");
		keys.begin("guild:user", "2");

		keys.end("guild:user", "1");
		expect(keys.isLatest("guild:user", "2")).toBe(true);

		keys.end("guild:user", "2");
		expect(keys.size).toBe(0);
	});
});
