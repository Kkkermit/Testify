import { loadEnv } from "./config/env";
import { TestifyClient } from "./core/client";
import { deployCommands } from "./core/deploy";
import { toError } from "./core/errors";
import { intents, partials } from "./core/intents";
import { createLogger, setLogger } from "./core/logger";
import { registerAll } from "./core/registry";
import { registerShutdownHandlers } from "./core/shutdown";
import { connectDatabase } from "./database/connection";
import { startIntegrations } from "./integrations";
import { startOAuthServer } from "./server/oauth";

/**
 * Boot: build the container, register modules, connect, log in. Nothing here runs
 * package installs, self-starts an HTTP server on import, or reads from the CWD.
 */
async function main(): Promise<void> {
	const env = loadEnv();

	const logger = createLogger({
		level: env.LOG_LEVEL,
		pretty: env.NODE_ENV !== "production",
		...(env.WEBHOOK_CONSOLE_LOGGING !== undefined ? { webhookUrl: env.WEBHOOK_CONSOLE_LOGGING } : {}),
	});
	setLogger(logger);

	const client = new TestifyClient({ intents, partials, env, logger });
	registerShutdownHandlers(client, logger);

	await connectDatabase({ uri: env.MONGODB_URI, logger });

	const counts = registerAll(client, client.messages, logger);
	logger.info(counts, "Modules registered");

	await deployCommands(client.commands.values(), {
		token: env.DISCORD_TOKEN,
		clientId: env.DISCORD_CLIENT_ID,
		...(env.DISCORD_DEV_GUILD_ID !== undefined ? { guildId: env.DISCORD_DEV_GUILD_ID } : {}),
		logger,
	});

	startIntegrations(client);

	// Only bind a port when the OAuth flow is actually configured.
	if (env.SPOTIFY_CLIENT_ID !== undefined && env.OAUTH_STATE_SECRET !== undefined) {
		const server = startOAuthServer(client);
		process.once("exit", () => server.close());
	}

	await client.login(env.DISCORD_TOKEN);
}

main().catch((error: unknown) => {
	const err = toError(error);
	// The logger may not exist yet if `loadEnv` was what failed.
	process.stderr.write(`Fatal error during startup: ${err.stack ?? err.message}\n`);
	process.exit(1);
});
