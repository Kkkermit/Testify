import play from "@commands/music/play.command";
import type * as MusicActions from "@lib/musicActions.util";
import { type Track } from "@lib/musicQueue.util";
import { CHOICE_MAX, MAX_CHOICES } from "@lib/musicSearch.util";
import type * as MusicSource from "@lib/musicSource.util";

jest.mock("@lib/musicActions.util", () => ({
	...jest.requireActual<typeof MusicActions>("@lib/musicActions.util"),
	musicBinaries: () => ({ ytDlp: "/bin/yt-dlp", ffmpeg: null }),
}));

jest.mock("@lib/musicSource.util", () => ({
	...jest.requireActual<typeof MusicSource>("@lib/musicSource.util"),
	resolveTracks: jest.fn(),
}));

const { resolveTracks } = jest.requireMock("@lib/musicSource.util");

function track(title: string, url = `https://youtu.be/${title}`): Track {
	return {
		url,
		title,
		author: "Artist",
		durationMs: 180_000,
		thumbnail: null,
		source: "youtube",
		requestedBy: "100000000000000001",
	};
}

interface Answer {
	name: string;
	value: string;
}

async function autocompleteFor(typed: string): Promise<Answer[]> {
	const respond = jest.fn((_choices: Answer[]) => Promise.resolve(undefined));
	const interaction = {
		options: { getFocused: () => typed },
		user: { id: "100000000000000001" },
		respond,
	};

	await play.autocomplete?.(interaction as never, {} as never);

	expect(respond).toHaveBeenCalledTimes(1);

	return respond.mock.calls[0]?.[0] ?? [];
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe("/play autocomplete", () => {
	/**
	 * The bug this pins: Discord closes an autocomplete interaction after three seconds, and a search that ran
	 * past it threw DiscordAPIError 10062 on every keystroke — logged as an error, with nothing offered to pick.
	 */
	it("answers a search that never finishes rather than letting the interaction expire", async () => {
		resolveTracks.mockImplementation(() => new Promise(() => undefined));

		const answered = await autocompleteFor("a search that hangs");

		expect(answered).toHaveLength(1);
		expect(answered[0]?.value).toBe("a search that hangs");
	});

	it("answers with what the search found when it is quick enough", async () => {
		resolveTracks.mockResolvedValue([track("quick-one")]);

		expect(await autocompleteFor("quick one")).toEqual([
			expect.objectContaining({ value: "https://youtu.be/quick-one" }),
		]);
	});

	it("still offers a way to press enter when the search fails", async () => {
		resolveTracks.mockRejectedValue(new Error("yt-dlp exited 1"));

		const answered = await autocompleteFor("a failing search");

		expect(answered).toEqual([expect.objectContaining({ value: "a failing search" })]);
	});

	it("does not search for a pasted link", async () => {
		const answered = await autocompleteFor("https://youtu.be/dQw4w9WgXcQ");

		expect(resolveTracks).not.toHaveBeenCalled();
		expect(answered).toEqual([{ name: "Play this link", value: "https://youtu.be/dQw4w9WgXcQ" }]);
	});

	/** Discord refuses a value over a hundred characters, and a link cut to fit is a link that plays nothing. */
	it("offers nothing rather than a truncated link", async () => {
		const long = `https://example.test/${"a".repeat(CHOICE_MAX)}`;

		expect(await autocompleteFor(long)).toEqual([]);
	});

	it("does not search for one or two letters", async () => {
		expect(await autocompleteFor("ab")).toEqual([]);
		expect(resolveTracks).not.toHaveBeenCalled();
	});

	/** Every one of these is a rejection from Discord rather than a warning, and it drops the whole reply. */
	it("never offers a row Discord would refuse", async () => {
		resolveTracks.mockResolvedValue(Array.from({ length: 40 }, (_, at) => track(`${"x".repeat(200)}${String(at)}`)));

		const answered = await autocompleteFor("a very wordy search");

		expect(answered.length).toBeLessThanOrEqual(MAX_CHOICES);
		for (const row of answered) {
			expect(row.name.length).toBeLessThanOrEqual(CHOICE_MAX);
			expect(row.value.length).toBeLessThanOrEqual(CHOICE_MAX);
		}
	});
});
