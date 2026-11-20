import { type Guild } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, notFound, notInGuild } from "@api/errors";
import { requireOwner } from "@api/middleware/session";
import { parseBody, parseParams, parseQuery } from "@api/validate";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { logRing } from "@core/logRing";
import { findLogRun, listLogRuns, readLogLines } from "@database/repositories/logRepository";
import {
	AnalyticsUnavailable,
	audienceReport,
	botActivityReport,
	botVersion,
	collectorSetup,
	commandReport,
	funnelReport,
	growthReport,
	guildUsageReport,
	liveFeedFor,
	panelsReport,
	readRuns,
	readTopRunners,
	reliabilityReport,
	retentionReport,
	runtimeInfo,
	usageReport,
} from "@lib/bot";
import {
	type AnalyticsProblem,
	analyticsQuery,
	analyticsZoneQuery,
	commandParam,
	funnelQuery,
	guildIdParam,
	type LogFeed,
	LOG_LEVEL_RANK,
	LOG_LIMITS,
	logQuery,
	logRunsQuery,
	type LogRun,
	type LogRuns,
	retentionQuery,
	runsBody,
	topRunnersQuery,
} from "@testify/shared";

/** The owner console's analytics and logs, read-only. Everything here is behind `requireOwner`. */

export const analytics = new Hono<ApiBindings>();

analytics.use("*", requireOwner);

const UNAVAILABLE: Record<AnalyticsProblem, string> = {
	off: "Analytics are read from Shardlens, which needs its address and a read key.",
	refused: "Shardlens refused the key.",
	unreachable: "Shardlens did not answer.",
	audit_off: "The collector is not in audit mode, so it keeps no record of who ran what.",
};

/** A 503 with its own code, since the bot is fine and only the collector is missing. */
async function fromShardlens<T>(work: () => Promise<T>): Promise<T> {
	try {
		return await work();
	} catch (error) {
		if (error instanceof AnalyticsUnavailable) {
			throw new ApiProblem(503, `analytics_${error.problem}`, UNAVAILABLE[error.problem]);
		}
		throw error;
	}
}

analytics.get("/usage", async (context) => {
	const { days } = parseQuery(context, analyticsQuery);
	return context.json(await fromShardlens(() => usageReport(context.get("client"), days)));
});

analytics.get("/audience", async (context) => {
	const { days, tz } = parseQuery(context, analyticsZoneQuery);
	return context.json(await fromShardlens(() => audienceReport(context.get("client"), days, tz)));
});

analytics.get("/growth", async (context) => {
	const { days } = parseQuery(context, analyticsQuery);
	return context.json(await fromShardlens(() => growthReport(context.get("client"), days)));
});

analytics.get("/panels", async (context) => {
	const { days } = parseQuery(context, analyticsQuery);
	return context.json(await fromShardlens(() => panelsReport(context.get("client"), days)));
});

analytics.get("/activity", async (context) => {
	const { days } = parseQuery(context, analyticsQuery);
	return context.json(await fromShardlens(() => botActivityReport(context.get("client"), days)));
});

analytics.get("/reliability", async (context) => {
	const { days } = parseQuery(context, analyticsQuery);
	return context.json(await fromShardlens(() => reliabilityReport(context.get("client"), days)));
});

function knownCommands(client: TestifyClient, names: (string | undefined)[]): void {
	const unknown = names.find((name) => name !== undefined && !client.commands.has(name));
	if (unknown !== undefined) throw new ApiProblem(400, "unknown_command", "That is not one of the bot's commands.");
}

analytics.get("/commands/:name", async (context) => {
	const { days } = parseQuery(context, analyticsQuery);
	const { name } = parseParams(context, commandParam);
	const client = context.get("client");
	knownCommands(client, [name]);
	return context.json(await fromShardlens(() => commandReport(client, name, days)));
});

/** How the collector is set up, read from its own overview, so a missing step for who ran what can be named. */
analytics.get("/setup", async (context) =>
	context.json(await fromShardlens(() => collectorSetup(context.get("client")))),
);

analytics.get("/funnel", async (context) => {
	const query = parseQuery(context, funnelQuery);
	const client = context.get("client");
	knownCommands(client, query.steps);
	return context.json(await fromShardlens(() => funnelReport(client, query)));
});

analytics.get("/retention", async (context) => {
	const query = parseQuery(context, retentionQuery);
	const client = context.get("client");
	knownCommands(client, [query.start, query.back]);
	return context.json(await fromShardlens(() => retentionReport(client, query)));
});

/** A POST so the person looked up never lands in an address, where a proxy, a log or a history keeps it. */
analytics.post("/runs", async (context) => {
	const body = await parseBody(context, runsBody);
	const client = context.get("client");
	knownCommands(client, [body.command]);
	return context.json(await fromShardlens(() => readRuns(client, body)));
});

/** Read from the one stream the bot keeps open while somebody is looking, never a stream per request. */
analytics.get("/live", (context) => context.json(liveFeedFor(context.get("client")).read()));

analytics.get("/runs/top", async (context) => {
	const { window } = parseQuery(context, topRunnersQuery);
	return context.json(await fromShardlens(() => readTopRunners(context.get("client"), window)));
});

analytics.get("/guilds/:guildId", async (context) => {
	const { days } = parseQuery(context, analyticsQuery);
	const client = context.get("client");
	const guild = botGuild(client, parseParams(context, guildIdParam).guildId);
	return context.json(await fromShardlens(() => guildUsageReport(client, guild, days)));
});

/** This run is read from memory, so the screen still works while the database is the thing that is wrong. */
analytics.get("/logs", async (context) => {
	const { limit, level, q, run } = parseQuery(context, logQuery);
	const loggerLevel = context.get("env").LOG_LEVEL;
	const capacity = LOG_LIMITS.linesPerRun;

	if (run === undefined || run === logRing.run.id) {
		const { lines, matched } = logRing.recent({ limit, minLevel: level, ...(q === undefined ? {} : { search: q }) });
		const body: LogFeed = {
			run: logRing.run.id,
			current: true,
			lines: lines.map((record) => ({
				at: new Date(record.at).toISOString(),
				level: record.level,
				message: record.message,
				context: record.context,
			})),
			buffered: logRing.size,
			capacity,
			// Nothing below this is ever written, so an empty list at `trace` means the bot is quiet rather than broken.
			loggerLevel,
			matched,
		};
		return context.json(body);
	}

	if ((await findLogRun(run)) === null) throw notFound("log_run_not_found", "There are no logs for that run.");

	const stored = await readLogLines(run, {
		limit,
		minRank: LOG_LEVEL_RANK[level],
		...(q === undefined ? {} : { search: q }),
	});
	const body: LogFeed = {
		run,
		current: false,
		lines: stored.lines.map((line) => ({
			at: line.at.toISOString(),
			level: line.level,
			message: line.message,
			context: storedContext(line.context),
		})),
		buffered: stored.held,
		capacity,
		loggerLevel,
		matched: stored.matched,
	};
	return context.json(body);
});

/** The runs kept, newest first; this one is always listed, whatever the database says. */
analytics.get("/logs/runs", async (context) => {
	const { level, q } = parseQuery(context, logRunsQuery);
	const search = q === undefined || q === "" ? undefined : { minRank: LOG_LEVEL_RANK[level], text: q };
	const tally = logRing.tally();
	const current: LogRun = {
		id: logRing.run.id,
		startedAt: new Date(logRing.run.startedAt).toISOString(),
		endedAt: null,
		lastAt: tally.lastAt === null ? null : new Date(tally.lastAt).toISOString(),
		version: botVersion(),
		current: true,
		matched: search === undefined ? null : logRing.recent({ limit: 1, minLevel: level, search: search.text }).matched,
		lines: logRing.size,
		errors: tally.errors,
		warnings: tally.warnings,
	};

	let past: LogRun[] = [];
	let pastUnavailable = false;
	try {
		past = (await listLogRuns(search))
			.filter((entry) => entry.run !== current.id)
			.map((entry) => ({
				id: entry.run,
				startedAt: entry.startedAt.toISOString(),
				endedAt: entry.endedAt?.toISOString() ?? null,
				lastAt: entry.lastAt?.toISOString() ?? null,
				version: entry.version,
				current: false,
				matched: entry.matched,
				lines: entry.lines,
				errors: entry.errors,
				warnings: entry.warnings,
			}));
	} catch (error) {
		context.get("client").logger.debug({ err: toError(error) }, "[LOGS] Past runs could not be read.");
		pastUnavailable = true;
	}

	const body: LogRuns = {
		runs: [current, ...past].slice(0, LOG_LIMITS.runsKept),
		kept: LOG_LIMITS.runsKept,
		pastUnavailable,
	};
	return context.json(body);
});

/** What was stored as JSON comes back as the object it was; anything else reads as an empty context. */
function storedContext(text: string): Record<string, unknown> {
	try {
		const parsed: unknown = JSON.parse(text);
		return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

analytics.get("/runtime", (context) => context.json(runtimeInfo(context.get("client"))));

function botGuild(client: TestifyClient, guildId: string): Guild {
	const guild = client.guilds.cache.get(guildId);
	if (guild === undefined) throw notInGuild();
	return guild;
}
