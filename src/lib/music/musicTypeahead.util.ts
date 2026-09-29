import { type AutocompleteInteraction } from "discord.js";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { CHOICE_MAX, SEARCH_RESULTS } from "@lib/music/music.constants";
import { type MusicBinaries, type MusicSource, type Query } from "@lib/music/music.types";
import { musicBinaries, requestedQuery } from "@lib/music/musicActions.util";
import { resolveQuery } from "@lib/music/musicQuery.util";
import {
	type Choice,
	choicesFor,
	interactionAge,
	interleave,
	Keystrokes,
	searchBudget,
	shouldSearch,
	stillOpen,
	Suggester,
} from "@lib/music/musicSearch.util";
import { resolveTracks } from "@lib/music/musicSource.util";
import { fallsBackToSoundCloud, readMusicSources, withinSources } from "@lib/music/musicSources.util";
import { type MusicSourceChoice } from "@testify/shared";

/** `/play`'s autocomplete: what it would play for the text so far, from whichever services the owner allows. */

/** Which services a search is put to: both at once for a plain search while the owner allows both. */
export function searchTargets(query: Query, sources: MusicSourceChoice): MusicSource[] {
	return fallsBackToSoundCloud(query, sources) ? ["youtube", "soundcloud"] : [query.source];
}

/** Asks every target, keeping what answered; only when none did is it a failure, so the next keystroke can try again. */
async function searchAll(
	query: Query,
	targets: MusicSource[],
	requestedBy: string,
	binaries: MusicBinaries,
): Promise<Choice[]> {
	const answers = await Promise.allSettled(
		targets.map((source) => resolveTracks({ ...query, source }, requestedBy, binaries, { flat: true })),
	);

	const lists = answers.map((answer) => (answer.status === "fulfilled" ? answer.value.slice(0, SEARCH_RESULTS) : []));
	const refused = answers.find((answer) => answer.status === "rejected");
	if (refused !== undefined && lists.every((list) => list.length === 0)) throw refused.reason;

	return choicesFor(interleave(lists), { labelled: targets.length > 1 });
}

/** `/play`'s typeahead, with a cache per set of services so a change of the owner's choice cannot offer the other's songs. */
export class TrackTypeahead {
	readonly #suggesters = new Map<string, Suggester>();
	readonly #keystrokes = new Keystrokes();

	/** What `/play` would play for this text and where it would search, or null for anything it would refuse. */
	async queryFor(typed: string): Promise<{ query: Query; targets: MusicSource[] } | null> {
		const sources = await readMusicSources();

		try {
			const query = withinSources(requestedQuery(typed), sources);
			return { query, targets: searchTargets(query, sources) };
		} catch (error) {
			if (error instanceof UserFacingError) return null;
			throw error;
		}
	}

	async answer(interaction: AutocompleteInteraction, client: TestifyClient): Promise<void> {
		const receivedAt = Date.now();
		const age = (): number => interactionAge(interaction.createdTimestamp, receivedAt);
		const typed = interaction.options.getFocused();

		if (resolveQuery(typed)?.kind !== "url" && !shouldSearch(typed)) {
			await interaction.respond([]);
			return;
		}

		const planned = await this.queryFor(typed);
		if (planned === null) {
			await interaction.respond([]);
			return;
		}

		const { query, targets } = planned;

		// A pasted link needs no lookup, and offering one row makes it obvious the paste was understood.
		if (query.kind === "url") {
			// A link Discord would refuse as a value is worse than no row at all: picking a cut-off one plays nothing.
			await interaction.respond(typed.length > CHOICE_MAX ? [] : [{ name: "Play this link", value: typed }]);
			return;
		}

		const typist = `${interaction.guildId ?? "dm"}:${interaction.user.id}`;
		this.#keystrokes.begin(typist, interaction.id);

		try {
			const choices = await this.#suggesterFor(targets.join("+")).suggest(
				typed,
				() => searchAll(query, targets, interaction.user.id, musicBinaries(client)),
				searchBudget(age()),
			);

			if (!stillOpen(age()) || !this.#keystrokes.isLatest(typist, interaction.id)) return;

			await interaction.respond(choices);
		} finally {
			this.#keystrokes.end(typist, interaction.id);
		}
	}

	#suggesterFor(key: string): Suggester {
		const existing = this.#suggesters.get(key);
		if (existing !== undefined) return existing;

		const created = new Suggester();
		this.#suggesters.set(key, created);
		return created;
	}
}
