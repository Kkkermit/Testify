import { startApi } from "@api/server";
import { dashboardBuilt } from "@api/static";
import { envFile, loadEnv } from "@config/env";
import { instanceFile, loadInstance } from "@config/instance";
import { botName } from "@core/brand";
import { TestifyClient } from "@core/client";
import { loadEverything, publishCommands, publishScope } from "@core/loader";
import { createLogger } from "@core/logger";
import { handleProcessSignals, isShuttingDown } from "@core/shutdown";
import { connectDatabase } from "@database/connection";
import {
	BootReport,
	botVersion,
	describeDatabase,
	exitOnFatalClose,
	featuresLine,
	logArchive,
	MINIMUM_NODE,
	nodeTooOld,
	printStartupFailure,
	shardlensLine,
	startShardlens,
	websiteLine,
} from "@lib/bot";
import { BOT_FEATURE_KEYS, BOT_FEATURES, switchedOff } from "@testify/shared";

async function main(): Promise<void> {
	const env = loadEnv();
	const instance = instanceFile(env);
	loadInstance(env);
	// A development bot always prints readable lines, even through `npm run dev:all`'s pipe.
	const logger = createLogger(env.LOG_LEVEL, process.stdout.isTTY === true || env.NODE_ENV === "development");

	const client = new TestifyClient(env, logger);
	handleProcessSignals(client);

	const report = new BootReport().stopWhen(isShuttingDown);
	report.header({
		name: botName(),
		version: botVersion(),
		mode: env.NODE_ENV,
		node: process.version,
		platform: `${process.platform} ${process.arch}`,
	});
	if (nodeTooOld(process.version)) {
		report.note(
			"warning",
			"Node",
			`${process.version} is older than the ${MINIMUM_NODE} this is tested on — update Node`,
		);
	}
	report.note("done", "Settings", `read from ${envFile().name}${instance.exists ? ` and ${instance.name}` : ""}`);

	const { pulled } = switchedOff(env.DISABLED_FEATURES);
	if (client.featuresOff.size > 0) {
		report.note("skipped", "Features", featuresLine(BOT_FEATURE_KEYS.filter((key) => client.featuresOff.has(key))));
	}
	for (const { feature, because } of pulled) {
		logger.info(
			{ feature, because },
			`[FEATURES] ${BOT_FEATURES[feature].label} is off too, because it needs ${BOT_FEATURES[because].label}.`,
		);
	}

	await report.step(
		"Database",
		() => connectDatabase({ uri: env.MONGODB_URI, logger }),
		() => describeDatabase(env.MONGODB_URI),
	);
	// Lines logged before the database answered are held in memory and written with the first batch.
	await logArchive.start(client);

	await report.step(
		"Modules",
		() => loadEverything(client, client.featuresOff),
		(counts) =>
			`${String(counts.commands)} commands · ${String(counts.menus)} right-click · ${String(counts.buttons)} buttons · ${String(counts.events)} events`,
	);

	await report.step(
		"Commands",
		() => publishCommands(client),
		(count) => `${String(count)} registered in ${publishScope(client)}`,
	);

	const website = env.DASHBOARD_ENABLED || env.SITE_ENABLED;
	if (!website) {
		report.note("skipped", "Website", "off — set SITE_ENABLED=true to serve the landing page and docs");
	} else if (env.NODE_ENV !== "development" && !dashboardBuilt()) {
		report.note("warning", "Website", "the API will run, but the pages are not built — run npm run build");
	}

	// Before login, so it sees the shards connect and every interaction from the first.
	if ((await startShardlens(client)) !== null) report.note("done", "Analytics", shardlensLine(env));

	exitOnFatalClose(client);
	report.note("working", "Discord", "logging in…");
	await client.login(env.DISCORD_TOKEN);
	if (isShuttingDown()) return;

	// After login, so the cache is filled; a website that fails to start does not stop the bot.
	if (website) {
		startApi(client, env)
			.ready.then(() => report.note("done", "Website", websiteLine(env)))
			.catch(() => report.note("warning", "Website", "could not start — the reason is in the log above"));
	}
}

// Startup is the one place a failure still exits: a bot that never connected has nothing to keep alive.
main().catch((error: unknown) => {
	// A reload or Ctrl+C partway through: shutdown() is already exiting, and whatever failed was its doing.
	if (isShuttingDown()) return;
	printStartupFailure(error);
	process.exit(1);
});
