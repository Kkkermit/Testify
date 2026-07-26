import { loadEnv } from "./config/env";
import { TestifyClient } from "./core/client";
import { toError } from "./core/errors";
import { loadEverything, publishCommands } from "./core/loader";
import { createLogger } from "./core/logger";
import { handleProcessSignals } from "./core/shutdown";
import { connectDatabase } from "./database/connection";

async function main(): Promise<void> {
	const env = loadEnv();
	const logger = createLogger(env.LOG_LEVEL, env.NODE_ENV !== "production");

	const client = new TestifyClient(env, logger);
	handleProcessSignals(client);

	await connectDatabase({ uri: env.MONGODB_URI, logger });

	const counts = loadEverything(client);
	logger.info(counts, "Loaded");

	await publishCommands(client);
	await client.login(env.DISCORD_TOKEN);
}

main().catch((error: unknown) => {
	const problem = toError(error);
	// The logger may not exist yet if reading the environment is what failed.
	process.stderr.write(`\nThe bot could not start:\n\n${problem.message}\n\n`);
	process.exit(1);
});
