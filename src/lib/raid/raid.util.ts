import { DAY_MS, MINUTE_MS } from "@config/constants";
import { RAID_LIMITS, type RaidSettings } from "@testify/shared";

/** The rules of raid protection, with the clock passed in: when an account is held, and when joins are a spike. */

/** When a hold on this account would lift, or null when it is old enough or nobody is held back. */
export function holdUntil(createdAt: number, minAccountAgeDays: number, now: number): number | null {
	if (minAccountAgeDays <= 0) return null;
	const until = createdAt + minAccountAgeDays * DAY_MS;
	return until > now ? until : null;
}

export interface WatchedJoin {
	userId: string;
	username: string;
	createdAt: number;
	/** True when the account was held back, false when it was too young but could not be. Absent when old enough. */
	held?: boolean;
	at: number;
}

export interface Spike {
	joins: number;
	minutes: number;
	/** Newest first, at most `RAID_LIMITS.listed`. */
	newest: WatchedJoin[];
	/** How many in the window were held back. */
	held: number;
}

/** More than any threshold allows, so one server's flood cannot grow without bound. */
const MOST_KEPT = RAID_LIMITS.maxSpikeJoins * 5;
/** A watch holding this many servers drops those whose newest join is older than any window. */
const MOST_SERVERS = 5_000;

/** Every server's recent joins, in memory only and keyed by server, so a restart forgets them and stores nothing. */
export class JoinWatch {
	readonly #joins = new Map<string, WatchedJoin[]>();
	readonly #alertedAt = new Map<string, number>();

	/** A spike the first time the window fills, and again every `alertEveryMinutes` while it stays full. */
	record(
		guildId: string,
		join: WatchedJoin,
		settings: Pick<RaidSettings, "spikeJoins" | "spikeMinutes">,
	): Spike | null {
		if (this.#joins.size > MOST_SERVERS) this.#sweep(join.at);

		const windowMs = settings.spikeMinutes * MINUTE_MS;
		const recent = (this.#joins.get(guildId) ?? []).filter((entry) => join.at - entry.at < windowMs);
		recent.push(join);
		this.#joins.set(guildId, recent.slice(-MOST_KEPT));

		if (recent.length < settings.spikeJoins || this.alerting(guildId, join.at)) return null;

		this.#alertedAt.set(guildId, join.at);
		return {
			joins: recent.length,
			minutes: settings.spikeMinutes,
			newest: recent.slice(-RAID_LIMITS.listed).reverse(),
			held: recent.filter((entry) => entry.held === true).length,
		};
	}

	/** True while a spike alert has been sent and is still recent, so a hold is not announced on its own as well. */
	alerting(guildId: string, now: number): boolean {
		const at = this.#alertedAt.get(guildId);
		return at !== undefined && now - at < RAID_LIMITS.alertEveryMinutes * MINUTE_MS;
	}

	forget(guildId: string): void {
		this.#joins.delete(guildId);
		this.#alertedAt.delete(guildId);
	}

	#sweep(now: number): void {
		const longest = RAID_LIMITS.maxSpikeMinutes * MINUTE_MS;
		for (const [guildId, joins] of this.#joins) {
			if (now - (joins.at(-1)?.at ?? 0) >= longest && !this.alerting(guildId, now)) this.forget(guildId);
		}
	}
}

export const joinWatch = new JoinWatch();

/** A typed whole number inside the bounds, or null for anything else. */
export function wholeNumber(text: string, min: number, max: number): number | null {
	const trimmed = text.trim();
	if (!/^\d+$/.test(trimmed)) return null;
	const value = Number(trimmed);
	return value >= min && value <= max ? value : null;
}
