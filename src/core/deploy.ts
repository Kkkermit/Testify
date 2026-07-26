import { REST, Routes } from "discord.js";
import { toSlashCommand } from "../adapters/slash";
import { hasSurface, type SharedCommand } from "./command";
import { type Logger } from "./logger";

export interface DeployOptions {
	token: string;
	clientId: string;
	/** When set, commands register to this guild only, which propagates instantly. */
	guildId?: string;
	logger: Logger;
}

export function buildCommandPayload(commands: Iterable<SharedCommand>): unknown[] {
	return [...commands]
		.filter((command) => hasSurface(command, "slash"))
		.map((command) => toSlashCommand(command).toJSON());
}

/**
 * Registers the application commands. Guild-scoped registration is now reachable —
 * the previous loader read `guildid` into a variable it never used, so every
 * command change took up to an hour to propagate.
 */
export async function deployCommands(commands: Iterable<SharedCommand>, options: DeployOptions): Promise<number> {
	const body = buildCommandPayload(commands);
	const rest = new REST({ version: "10" }).setToken(options.token);

	const route =
		options.guildId !== undefined
			? Routes.applicationGuildCommands(options.clientId, options.guildId)
			: Routes.applicationCommands(options.clientId);

	await rest.put(route, { body });
	options.logger.info(
		{ count: body.length, scope: options.guildId !== undefined ? `guild:${options.guildId}` : "global" },
		"Registered application commands",
	);

	return body.length;
}
