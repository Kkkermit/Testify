import { DEFAULT_PREFIX } from "../../config/constants";
import { runChecks } from "../../core/checks";
import { runCommand } from "../../core/errors";
import { defineMessageHandler } from "../../core/message";
import { parseMessage, PrefixInteraction } from "../../core/prefix";
import { getPrefixConfig } from "../../database/repositories/settingsRepository";
import { errorEmbed } from "../../lib/embeds";

/**
 * Runs `t?ban @someone` through exactly the same code as `/ban`, including the
 * permission, cooldown and blacklist checks. Set the server's prefix with
 * `/prefix`; mentioning the bot works too.
 */
export default defineMessageHandler({
	name: "prefixCommands",
	order: 10,
	async run(message, client) {
		const botId = client.user?.id;
		if (botId === undefined) return;

		// A direct message has no server to have configured anything.
		const config =
			message.guild === null ? { prefix: DEFAULT_PREFIX, isEnabled: true } : await getPrefixConfig(message.guild.id);

		if (!config.isEnabled) return;

		const prefix = config.prefix;
		const parsed = parseMessage(message.content, prefix, botId);
		if (parsed === null) return;

		// An alias can point at a subcommand — "meme" means "lookup meme" — in which
		// case the subcommand name goes back on the front of the arguments.
		const [name = parsed.name, subcommand] = (client.aliases.get(parsed.name) ?? parsed.name).split(" ");
		const args = subcommand === undefined ? parsed.args : [subcommand, ...parsed.args];

		const command = client.commands.get(name);
		if (!command) return;

		client.logger.debug({ command: command.name, user: message.author.id }, "Running a prefix command");

		const interaction = new PrefixInteraction(message, command, args);

		const refusal = await runChecks(interaction, command, client);
		if (refusal !== null) {
			await message.reply({ embeds: [errorEmbed(refusal)] });
			return true;
		}

		await runCommand(interaction, command, client);
		return true;
	},
});
