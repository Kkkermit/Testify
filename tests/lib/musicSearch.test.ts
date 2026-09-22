import { type Track } from "@lib/musicQueue.util";
import {
	CHOICE_MAX,
	choiceFor,
	choicesFor,
	literalChoice,
	MAX_CHOICES,
	SearchCache,
	shouldSearch,
} from "@lib/musicSearch.util";

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

	/**
	 * The value is an address, and a truncated address is a broken one — so an over-long URL is dropped
	 * rather than offered as something that cannot be played.
	 */
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
