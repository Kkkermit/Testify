import { runChecks } from "../../core/checks";
import { runCommand } from "../../core/errors";
import { defineMessageHandler } from "../../core/message";
import { parseMessage, PrefixInteraction } from "../../core/prefix";
import { getPrefix } from "../../database/repositories/settingsRepository";
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
		if (botId === undefined || message.guild === null) return;

		const prefix = await getPrefix(message.guild.id);
		const parsed = parseMessage(message.content, prefix, botId);
		if (parsed === null) return;

		// An alias can point at a subcommand — "meme" means "lookup meme" — in which
		// case the subcommand name goes back on the front of the arguments.
		const [name = parsed.name, subcommand] = (client.aliases.get(parsed.name) ?? parsed.name).split(" ");
		const args = subcommand === undefined ? parsed.args : [subcommand, ...parsed.args];

		const command = client.commands.get(name);
		if (!command) return;

		// Autocomplete has nowhere to appear on a message, and a command that only
		// makes sense with it would be confusing rather than broken.
		if (command.autocomplete) {
			await message.reply({ embeds: [errorEmbed(`\`${command.name}\` is only available as \`/${command.name}\`.`)] });
			return true;
		}

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
