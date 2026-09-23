import { startApi } from "@api/server";
import { loadEnv } from "@config/env";
import { TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { loadEverything, publishCommands } from "@core/loader";
import { createLogger } from "@core/logger";
import { handleProcessSignals } from "@core/shutdown";
import { connectDatabase } from "@database/connection";

async function main(): Promise<void> {
	const env = loadEnv();
	const logger = createLogger(env.LOG_LEVEL);

	const client = new TestifyClient(env, logger);
	handleProcessSignals(client);

	await connectDatabase({ uri: env.MONGODB_URI, logger });

	const counts = loadEverything(client);
	logger.debug(counts, "Loaded modules");

	await publishCommands(client);
	await client.login(env.DISCORD_TOKEN);

	// After login, so the cache is filled; a dashboard that fails to start does not stop the bot.
	if (env.DASHBOARD_ENABLED) {
		startApi(client, env).ready.catch(() => undefined);
	}
}

// Startup is the one place a failure still exits: a bot that never connected has nothing to keep alive.
main().catch((error: unknown) => {
	const problem = toError(error);
	// Straight to stderr with the stack, since the logger may not exist yet.
	process.stderr.write(`\nThe bot could not start:\n\n${problem.message}\n\n${problem.stack ?? ""}\n`);
	process.exit(1);
});
