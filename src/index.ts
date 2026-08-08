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

	// After login, so the dashboard can never read a cache that is not filled yet. The bot outlives it: a busy
	// port is the operator's to fix, and is no reason to take the commands down with it.
	if (env.DASHBOARD_ENABLED) {
		startApi(client, env).ready.catch(() => undefined);
	}
}

main().catch((error: unknown) => {
	const problem = toError(error);
	// The logger may not exist yet if reading the environment is what failed, so this goes straight to stderr —
	// with the stack, because a message alone rarely says which of the startup steps gave up.
	process.stderr.write(`\nThe bot could not start:\n\n${problem.message}\n\n${problem.stack ?? ""}\n`);
	process.exit(1);
});
