import { REST, Routes } from "discord.js";
import { loadEnv } from "@config/env";
import { painter, stepLine } from "@core/terminal";
import { printStartupFailure } from "@lib/bot/startup.util";

const paint = painter();

/** Removes every slash command this application registered, globally and in the development server. */
async function main(): Promise<void> {
	const env = loadEnv();
	const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);

	await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: [] });
	console.log(stepLine("done", "Global", "every command removed", undefined, paint));

	if (env.DISCORD_DEV_GUILD_ID !== undefined) {
		await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_DEV_GUILD_ID), { body: [] });
		console.log(
			stepLine("done", "Test server", `every command removed from ${env.DISCORD_DEV_GUILD_ID}`, undefined, paint),
		);
	}

	console.log(`\n  ${paint.cyan("➜")} Start the bot to publish the current set.`);
}

main().catch((error: unknown) => {
	printStartupFailure(error);
	process.exitCode = 1;
});
