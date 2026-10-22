import { type TestifyClient } from "@core/client";
import { chosenSubcommand, type Command, type CommandInput } from "@core/command";
import { toError } from "@core/errors";
import { recordCommandRun } from "@database/repositories/commandRunRepository";
import { recordCommandUse } from "@database/repositories/usageRepository";
import { type CommandRun } from "@lib/bot/commandLog.util";

/** Counts one invocation for the owner console, and notes who ran it in a server; unawaited, so a reply never waits. */
export function countCommandUse(client: TestifyClient, input: CommandInput, command: Command, run: CommandRun): void {
	const failed = !run.ok;
	const writes = [recordCommandUse({ command: command.name, guildId: input.guildId, surface: run.surface, failed })];

	if (input.guildId !== null) {
		writes.push(
			recordCommandRun({
				guildId: input.guildId,
				channelId: run.channelId,
				userId: input.user.id,
				username: input.user.username,
				command: command.name,
				subcommand: chosenSubcommand(input, command),
				surface: run.surface,
				failed,
				durationMs: run.durationMs,
			}),
		);
	}

	for (const write of writes) {
		void write.catch((error: unknown) => {
			client.logger.debug(
				{ err: toError(error), command: command.name },
				"[ANALYTICS] Could not record a command use. The command itself was unaffected.",
			);
		});
	}
}
