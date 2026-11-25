import { type ActivityLogPage, type ActivityTopUsers } from "@shardlens/client";
import { z } from "zod";
import { type TestifyClient } from "@core/client";
import { ownHandlerName } from "@lib/bot/shardlens.util";
import { rangeOf, readerFor } from "@lib/bot/shardlensReader.util";
import { RUN_LIMITS, RUN_OUTCOMES, type RunRow, type RunsBody, type RunsPage, type TopRunners } from "@testify/shared";

/** Who ran what, read from a collector in audit mode with the activity key, for the owners alone. */

const SNOWFLAKE = /^\d{17,20}$/;
/** Discord's avatar hash; anything else never becomes part of an address. */
const AVATAR_HASH = /^(a_)?[0-9a-f]{32}$/;
const MAX_TEXT = 100;

const text = z
	.string()
	.nullable()
	.transform((value) => (value === null ? null : value.slice(0, MAX_TEXT)));

const runRow = z.object({
	interactionId: z.string().max(64),
	ts: z
		.string()
		.max(40)
		.refine((value) => !Number.isNaN(Date.parse(value))),
	guildId: z.string().nullable(),
	guildName: text,
	kind: z.string().max(32),
	command: text,
	sub: text,
	customId: text,
	outcome: z.enum(RUN_OUTCOMES),
	ackMs: z.number().nullable(),
	userId: z.string().nullable(),
	username: text,
	avatar: z.string().nullable(),
});

const runsAnswer = z.object({ rows: z.array(runRow), nextBefore: z.string().nullable() });

const topAnswer = z.object({
	window: z.enum(["24h", "7d"]),
	rows: z.array(z.object({ userId: z.string().nullable(), runs: z.number() })),
});

/** A schema that would refuse what the client says the collector sends is a compile error, not an empty log. */
const takesWhatIsSent: [
	ActivityLogPage extends z.input<typeof runsAnswer> ? true : never,
	ActivityTopUsers extends z.input<typeof topAnswer> ? true : never,
] = [true, true];
void takesWhatIsSent;

const idOrNull = (value: string | null): string | null => (value !== null && SNOWFLAKE.test(value) ? value : null);

function avatarUrl(userId: string | null, hash: string | null): string | null {
	if (userId === null || hash === null || !AVATAR_HASH.test(hash)) return null;
	return `https://cdn.discordapp.com/avatars/${userId}/${hash}.webp?size=64`;
}

function rowOf(client: TestifyClient, row: z.output<typeof runRow>): RunRow {
	const guildId = idOrNull(row.guildId);
	const userId = idOrNull(row.userId);
	const known = userId === null ? undefined : client.users.cache.get(userId);
	return {
		id: row.interactionId,
		at: row.ts,
		guildId,
		guildName: row.guildName ?? (guildId === null ? null : (client.guilds.cache.get(guildId)?.name ?? null)),
		kind: row.kind,
		command: row.command,
		sub: row.sub,
		handler: ownHandlerName(client, row.customId),
		outcome: row.outcome,
		answerMs: row.ackMs,
		userId,
		username: row.username ?? known?.username ?? null,
		avatarUrl: avatarUrl(userId, row.avatar) ?? known?.displayAvatarURL({ size: 64 }) ?? null,
	};
}

export async function readRuns(client: TestifyClient, body: RunsBody, now = Date.now()): Promise<RunsPage> {
	const reader = readerFor(client);
	const page = await reader.activityLog(
		{
			from: rangeOf(body.days, now).from,
			limit: RUN_LIMITS.perPage,
			...(body.before === undefined ? {} : { before: body.before }),
			...(body.guildId === undefined ? {} : { guild: body.guildId }),
			...(body.command === undefined ? {} : { command: body.command }),
			...(body.userId === undefined ? {} : { user: body.userId }),
			...(body.outcome === undefined ? {} : { outcome: body.outcome }),
		},
		runsAnswer,
	);

	return {
		rows: page.rows.map((row) => rowOf(client, row)),
		next: page.nextBefore,
		collector: reader.collector ?? "",
	};
}

/** Names come only from the bot's own cache: looking up twenty-five people to label a list is not worth the requests. */
export async function readTopRunners(client: TestifyClient, window: TopRunners["window"]): Promise<TopRunners> {
	const answer = await readerFor(client).topUsers(window, topAnswer);

	return {
		window: answer.window,
		rows: answer.rows.map((row) => {
			const userId = idOrNull(row.userId);
			const known = userId === null ? undefined : client.users.cache.get(userId);
			return {
				userId,
				username: known?.username ?? null,
				avatarUrl: known?.displayAvatarURL({ size: 64 }) ?? null,
				runs: row.runs,
			};
		}),
	};
}
