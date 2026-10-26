import { PermissionFlagsBits } from "discord.js";
import { channelOption, defineCommand, inTextChannel } from "@core/command";
import { UserFacingError } from "@core/errors";
import { reply, successEmbed } from "@lib/discord";
import { formatDurationLong, parseDuration } from "@lib/format";
import { setSlowmode } from "@lib/moderation";
import { CHANNEL_TOOL_LIMITS } from "@testify/shared";

export default defineCommand({
	name: "slowmode",
	description: "Sets the slowmode for a channel.",
	category: "moderation",
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageChannels],
	botPermissions: [PermissionFlagsBits.ManageChannels],
	options: [
		{ name: "duration", description: "For example 10s, 5m or 0 to turn it off.", type: "string", required: true },
		{
			name: "channel",
			description: "The channel to change. Defaults to this one.",
			type: "channel",
		},
	],

	async run(interaction) {
		const channel = channelOption(interaction, "channel") ?? inTextChannel(interaction);

		const raw = interaction.options.getString("duration", true);
		const durationMs = raw === "0" ? 0 : parseDuration(raw);
		if (durationMs === null) throw new UserFacingError("That duration is not valid. Try `10s`, `5m` or `0`.");

		const seconds = Math.floor(durationMs / 1_000);
		if (seconds > CHANNEL_TOOL_LIMITS.maxSlowmodeSeconds)
			throw new UserFacingError("Slowmode cannot be longer than six hours.");

		await setSlowmode(channel, seconds, `Set by ${interaction.user.username}`);

		await reply(interaction, {
			embeds: [
				successEmbed(
					seconds === 0
						? `Slowmode has been turned off in ${channel}.`
						: `Slowmode in ${channel} is now **${formatDurationLong(seconds * 1_000)}**.`,
				),
			],
		});
	},
});
