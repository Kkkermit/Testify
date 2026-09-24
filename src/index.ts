import { startApi } from "@api/server";
import { dashboardBuilt } from "@api/static";
import { envFile, loadEnv } from "@config/env";
import { botName } from "@core/brand";
import { TestifyClient } from "@core/client";
import { loadEverything, publishCommands, publishScope } from "@core/loader";
import { createLogger } from "@core/logger";
import { handleProcessSignals } from "@core/shutdown";
import { connectDatabase } from "@database/connection";
import {
	BootReport,
	botVersion,
	dashboardUrl,
	describeDatabase,
	exitOnFatalClose,
	MINIMUM_NODE,
	nodeTooOld,
	printStartupFailure,
} from "@lib/bot";

async function main(): Promise<void> {
	const env = loadEnv();
	// A development bot always prints readable lines, even through `npm run dev:all`'s pipe.
	const logger = createLogger(env.LOG_LEVEL, process.stdout.isTTY === true || env.NODE_ENV === "development");

	const client = new TestifyClient(env, logger);
	handleProcessSignals(client);

	const report = new BootReport();
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
	report.note("done", "Settings", `read from ${envFile().name}`);

	await report.step(
		"Database",
		() => connectDatabase({ uri: env.MONGODB_URI, logger }),
		() => describeDatabase(env.MONGODB_URI),
	);

	await report.step(
		"Modules",
		() => loadEverything(client),
		(counts) =>
			`${String(counts.commands)} commands · ${String(counts.buttons)} buttons · ${String(counts.events)} events`,
	);

	await report.step(
		"Commands",
		() => publishCommands(client),
		(count) => `${String(count)} registered in ${publishScope(client)}`,
	);

	if (!env.DASHBOARD_ENABLED) {
		report.note("skipped", "Dashboard", "off — set DASHBOARD_ENABLED=true to turn it on");
	} else if (env.NODE_ENV !== "development" && !dashboardBuilt()) {
		report.note("warning", "Dashboard", "the API will run, but the pages are not built — run npm run build");
	}

	exitOnFatalClose(client);
	report.note("working", "Discord", "logging in…");
	await client.login(env.DISCORD_TOKEN);

	// After login, so the cache is filled; a dashboard that fails to start does not stop the bot.
	if (env.DASHBOARD_ENABLED) {
		startApi(client, env)
			.ready.then(() => report.note("done", "Dashboard", dashboardUrl(env) ?? ""))
			.catch(() => report.note("warning", "Dashboard", "could not start — the reason is in the log above"));
	}
}

// Startup is the one place a failure still exits: a bot that never connected has nothing to keep alive.
main().catch((error: unknown) => {
	printStartupFailure(error);
	process.exit(1);
});
