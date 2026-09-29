import play from "@commands/music/play.command";
import { CHOICE_MAX } from "@lib/music/music.constants";
import { type Track } from "@lib/music/music.types";
import type * as MusicBinaries from "@lib/music/musicBinaries.util";
import { MAX_CHOICES } from "@lib/music/musicSearch.util";
import type * as MusicSource from "@lib/music/musicSource.util";

jest.mock("@lib/music/musicBinaries.util", () => ({
	...jest.requireActual<typeof MusicBinaries>("@lib/music/musicBinaries.util"),
	findBinaries: () => ({ ytDlp: "/bin/yt-dlp", ffmpeg: null }),
}));

jest.mock("@lib/music/musicSource.util", () => ({
	...jest.requireActual<typeof MusicSource>("@lib/music/musicSource.util"),
	resolveTracks: jest.fn(),
}));

// One service, so each search is one call; the mixed typeahead has its own tests below.
jest.mock("@database/repositories/botSettingsRepository", () => ({
	getBotSettings: jest.fn(() => Promise.resolve({ musicSources: "youtube" })),
}));

const { resolveTracks } = jest.requireMock("@lib/music/musicSource.util");
const { getBotSettings } = jest.requireMock("@database/repositories/botSettingsRepository");

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

let nextId = 0;

function typing(typed: string, userId = "100000000000000001") {
	nextId += 1;

	return {
		id: String(nextId),
		guildId: "200000000000000001",
		createdTimestamp: Date.now(),
		options: { getFocused: () => typed },
		user: { id: userId },
		respond: jest.fn((_choices: Answer[]) => Promise.resolve(undefined)),
	};
}

async function autocompleteFor(typed: string): Promise<Answer[]> {
	const interaction = typing(typed);
	const respond = interaction.respond;

	await play.autocomplete?.(interaction as never, {} as never);

	expect(respond).toHaveBeenCalledTimes(1);

	return respond.mock.calls[0]?.[0] ?? [];
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe("/play autocomplete", () => {
	/** A search that outruns the three-second window is answered anyway, rather than failing with 10062. */
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

	/** Discord's client shows only the newest keystroke's answer, and answering an older one was a refused request. */
	it("does not answer a keystroke somebody has already typed past", async () => {
		let finish: (tracks: Track[]) => void = () => undefined;
		resolveTracks.mockImplementationOnce(() => new Promise<Track[]>((resolve) => (finish = resolve)));
		resolveTracks.mockResolvedValueOnce([track("bushido")]);

		const first = typing("bushi");
		const second = typing("bushid");
		const firstDone = play.autocomplete?.(first as never, {} as never);
		await play.autocomplete?.(second as never, {} as never);
		finish([track("bushi")]);
		await firstDone;

		expect(first.respond).not.toHaveBeenCalled();
		expect(second.respond).toHaveBeenCalledTimes(1);
	});

	it("answers two people typing at once, because one person's keystroke never supersedes another's", async () => {
		let finish: (tracks: Track[]) => void = () => undefined;
		resolveTracks.mockImplementationOnce(() => new Promise<Track[]>((resolve) => (finish = resolve)));
		resolveTracks.mockResolvedValueOnce([track("other")]);

		const first = typing("first person", "100000000000000001");
		const second = typing("second person", "100000000000000002");
		const firstDone = play.autocomplete?.(first as never, {} as never);
		await play.autocomplete?.(second as never, {} as never);
		finish([track("first")]);
		await firstDone;

		expect(first.respond).toHaveBeenCalledTimes(1);
		expect(second.respond).toHaveBeenCalledTimes(1);
	});
});

describe("/play autocomplete with the owner's choice of sources", () => {
	const fromSoundCloud = (title: string): Track => ({
		...track(title, `https://soundcloud.com/artist/${title}`),
		source: "soundcloud",
	});

	/** What "both" means to the person typing: the two services' songs side by side, each saying where it is from. */
	it("offers YouTube and SoundCloud together, one from each in turn, labelled", async () => {
		getBotSettings.mockResolvedValue({ musicSources: "both" });
		resolveTracks.mockImplementation((query: { source: string }) =>
			Promise.resolve(
				query.source === "soundcloud" ? [fromSoundCloud("sc-1"), fromSoundCloud("sc-2")] : [track("yt-1")],
			),
		);

		const answered = await autocompleteFor("mixed search");

		expect(answered.map((choice) => choice.value)).toEqual([
			"https://youtu.be/yt-1",
			"https://soundcloud.com/artist/sc-1",
			"https://soundcloud.com/artist/sc-2",
		]);
		expect(answered[0]?.name).toMatch(/^YouTube · /);
		expect(answered[1]?.name).toMatch(/^SoundCloud · /);
	});

	/** A flagged host is exactly when this matters: YouTube refusing must not take SoundCloud's songs with it. */
	it("still offers SoundCloud's songs when YouTube refuses", async () => {
		getBotSettings.mockResolvedValue({ musicSources: "both" });
		resolveTracks.mockImplementation((query: { source: string }) =>
			query.source === "soundcloud"
				? Promise.resolve([fromSoundCloud("only-sc")])
				: Promise.reject(new Error("Sign in to confirm you are not a bot")),
		);

		expect(await autocompleteFor("youtube refuses this")).toEqual([
			expect.objectContaining({ value: "https://soundcloud.com/artist/only-sc" }),
		]);
	});

	it("searches SoundCloud alone, unlabelled, when the owner chose it", async () => {
		getBotSettings.mockResolvedValue({ musicSources: "soundcloud" });
		resolveTracks.mockResolvedValue([fromSoundCloud("solo")]);

		const answered = await autocompleteFor("soundcloud only search");

		expect(resolveTracks).toHaveBeenCalledTimes(1);
		expect(resolveTracks.mock.calls[0]?.[0]).toMatchObject({ source: "soundcloud" });
		expect(answered[0]?.name).not.toMatch(/SoundCloud · /);
	});

	it("offers nothing for a link to a service the owner switched off", async () => {
		getBotSettings.mockResolvedValue({ musicSources: "soundcloud" });

		expect(await autocompleteFor("https://youtu.be/dQw4w9WgXcQ")).toEqual([]);
	});
});
