import { DEFAULT_PREFIX } from "@config/constants";
import { botName } from "@core/brand";
import { checkCommand } from "@core/checks";
import { chosenSubcommand, givenOptions } from "@core/command";
import { runCommand } from "@core/errors";
import { readerLanguage, say } from "@core/language";
import { defineMessageHandler } from "@core/message";
import { parseMessage, PrefixInteraction } from "@core/prefix";
import { getPrefixConfig } from "@database/repositories/prefixRepository";
import { logCommandUse, recordCommandTime, recordPrefixRun, recordRefusal } from "@lib/bot";
import { refusalEmbed, replyTemporarily } from "@lib/discord";
import { mentionNoticesAfterCommand, NOTICE_COMMAND, noticeHint } from "@lib/notices";
import { commandIsOff } from "@testify/shared";

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

		// An alias can point at a subcommand, whose name goes back on the front of the arguments.
		const [name = parsed.name, subcommand] = (client.aliases.get(parsed.name) ?? parsed.name).split(" ");
		const args = subcommand === undefined ? parsed.args : [subcommand, ...parsed.args];

		// `commandIsOff` matches only a name a feature declares, so what is counted is never free text.
		const lowered = name.toLowerCase();
		if (commandIsOff(client.featuresOff, lowered, args[0]?.toLowerCase())) {
			recordRefusal(client, lowered, "feature_off", "prefix", message.guildId);
			const refusal = say(readerLanguage({ guild: message.guild }), "featureOff", { bot: botName() });
			await replyTemporarily(client, message, refusalEmbed(refusal));
			return true;
		}

		const command = client.commands.get(name);
		if (!command) return;

		client.logger.debug({ command: command.name, user: message.author.id }, "[PREFIX] Running a prefix command.");

		const interaction = new PrefixInteraction(message, command, args);
		await interaction.options.prepare();

		const refusal = await checkCommand(interaction, command, client);
		if (refusal !== null) {
			recordRefusal(client, command.name, refusal.reason, "prefix", message.guildId);
			// A message cannot be private, so the refusal clears itself rather than staying in the channel.
			await replyTemporarily(client, message, refusalEmbed(refusal.failure));
			return true;
		}

		const started = Date.now();
		const { ok, error } = await runCommand(interaction, command, client);
		const durationMs = Date.now() - started;
		recordCommandTime(durationMs, ok);
		logCommandUse(client, interaction, command, {
			surface: "prefix",
			ok,
			durationMs,
			channelId: message.guild === null ? null : message.channelId,
			prefix,
			typed: `${parsed.prefix ?? `@${client.user?.username ?? "mention"} `}${parsed.name}`,
		});
		recordPrefixRun(client, message, {
			command: command.name,
			subcommand: chosenSubcommand(interaction, command),
			options: givenOptions(interaction, command).map((option) => option.name),
			durationMs,
			ok,
			error,
		});
		// A message cannot be private, so the hint clears itself like a refusal.
		mentionNoticesAfterCommand(message.author.id, client.logger, (unread) =>
			replyTemporarily(client, message, noticeHint(unread, `${prefix}${NOTICE_COMMAND}`)),
		);
		return true;
	},
});
