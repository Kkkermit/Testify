import { createPrefixContext } from "../../../adapters/prefix";
import { hasSurface } from "../../../core/command";
import { defineMessageProcessor } from "../../../core/messagePipeline";
import { runCommand } from "../../../core/execute";
import { strings } from "../../../config/strings";
import { DEFAULT_PREFIX } from "../../../config/constants";
import { getGuildSettings } from "../../../database/repositories/guildSettingsRepository";
import { errorEmbed } from "../../../ui/embeds";

/**
 * The prefix dispatcher. Three defects from the previous version are fixed here:
 * the prefix comparison is now case-insensitive on both sides, the unknown-command
 * branch cannot fall through to dispatch, and the command is awaited so its errors
 * reach the shared error boundary.
 */
export default defineMessageProcessor({
	name: "prefixCommands",
	order: 10,
	async run(client, message) {
		const settings = message.guild ? await getGuildSettings(message.guild.id) : null;
		const prefix = settings?.prefix ?? DEFAULT_PREFIX;

		const content = message.content;
		if (!content.toLowerCase().startsWith(prefix.toLowerCase())) return false;

		if (settings && !settings.isPrefixEnabled) {
			await message.reply({
				embeds: [
					errorEmbed(
						"The prefix system has not been enabled in this server. An admin can turn it on with `/prefix toggle`.",
					),
				],
			});
			return true;
		}

		const args = content.slice(prefix.length).trim().split(/\s+/);
		const invoked = args.shift()?.toLowerCase();
		if (invoked === undefined || invoked.length === 0) return false;

		const command = client.resolveCommand(invoked);
		if (!command || !hasSurface(command, "prefix")) {
			await message.reply({ embeds: [errorEmbed(strings.generic.unknownCommand(prefix))] });
			return true;
		}

		const ctx = await createPrefixContext(client, message, command, args);
		await runCommand(ctx, command);
		return true;
	},
});
