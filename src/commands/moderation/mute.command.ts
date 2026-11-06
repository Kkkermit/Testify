import { PermissionFlagsBits } from "discord.js";
import { strings } from "@config/strings";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { reply } from "@lib/discord";
import { parseDuration } from "@lib/format";
import { assertModeratable, DEFAULT_REASON, moderatorOf, timedOutEmbed, timeoutMember } from "@lib/moderation";

export default defineCommand({
	name: "mute",
	description: "Times a member out.",
	category: "moderation",
	aliases: ["timeout"],
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
		if (durationMs === null) {
			throw new UserFacingError("That duration is not valid. Try something like `10m`, `2h` or `3d`.");
		}

		const member = await guild.members.fetch(target.id).catch(() => null);
		if (!member) throw new UserFacingError(strings.moderation.memberNotFound);

		assertModeratable(interaction, member);
		const { notified: delivered } = await timeoutMember(
			guild,
			member,
			moderatorOf(interaction.user),
			durationMs,
			reason,
		);
		await reply(interaction, {
			embeds: [timedOutEmbed({ guild, target, moderator: interaction.user, reason, durationMs, notified: delivered })],
		});
	},
});
