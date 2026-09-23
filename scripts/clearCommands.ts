import { REST, Routes } from "discord.js";
import { loadEnv } from "@config/env";

/** Removes every slash command this application registered, globally and in the development server. */
async function main(): Promise<void> {
	const env = loadEnv();
	const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);

	await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: [] });
	console.log("Cleared the global commands.");

	if (env.DISCORD_DEV_GUILD_ID !== undefined) {
		await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_DEV_GUILD_ID), { body: [] });
		console.log(`Cleared the commands in server ${env.DISCORD_DEV_GUILD_ID}.`);
	}

	console.log("\nStart the bot to publish the current set.");
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
