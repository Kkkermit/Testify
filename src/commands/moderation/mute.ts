import { PermissionFlagsBits } from "discord.js";
import { strings } from "../../config/strings";
import { theme } from "../../config/theme";
import { defineCommand, inGuild } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { parseDuration } from "../../lib/duration";
import { formatDurationLong } from "../../lib/format";
import { actionEmbed, assertModeratable, DEFAULT_REASON, dmEmbed, notifyTarget } from "../../lib/moderationActions";
import { reply } from "../../lib/reply";

/** Discord's timeout ceiling. */
const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1_000;

export default defineCommand({
	name: "mute",
	description: "Times a member out.",
	category: "moderation",
	guildOnly: true,
	permissions: [PermissionFlagsBits.ModerateMembers],
	botPermissions: [PermissionFlagsBits.ModerateMembers],
	options: [
		{ name: "user", description: "The member to time out.", type: "user", required: true },
		{ name: "duration", description: "How long, for example 10m, 2h or 3d.", type: "string", required: true },
		{ name: "reason", description: "Why they are being timed out.", type: "string" },
	],

	async run(interaction) {
		const guild = inGuild(interaction);
		const target = interaction.options.getUser("user", true);
		const reason = interaction.options.getString("reason") ?? DEFAULT_REASON;

		const durationMs = parseDuration(interaction.options.getString("duration", true));
		if (durationMs === null || durationMs <= 0) {
			throw new UserFacingError("That duration is not valid. Try something like `10m`, `2h` or `3d`.");
		}
		if (durationMs > MAX_TIMEOUT_MS) {
			throw new UserFacingError("Discord only allows timeouts of up to 28 days.");
		}

		const member = await guild.members.fetch(target.id).catch(() => null);
		if (!member) throw new UserFacingError(strings.moderation.memberNotFound);

		assertModeratable(interaction, member);
		if (!member.moderatable) throw new UserFacingError(strings.moderation.notModeratable);

		const readable = formatDurationLong(durationMs);
		const delivered = await notifyTarget(
			target,
			dmEmbed({
				action: `timed out in ${guild.name}`,
				emoji: theme.emoji.moderation,
				guild,
				moderator: interaction.user,
				reason,
				extra: [{ name: "Duration", value: readable, inline: true }],
			}),
		);

		await member.timeout(durationMs, `${interaction.user.username}: ${reason}`);

		await reply(interaction, {
			embeds: [
				actionEmbed({
					action: "Member timed out",
					emoji: theme.emoji.moderation,
					guild,
					target,
					moderator: interaction.user,
					reason,
					extra: [
						{ name: "Duration", value: readable, inline: true },
						{ name: "Notified", value: delivered ? "Yes" : "No", inline: true },
					],
				}),
			],
		});
	},
});
