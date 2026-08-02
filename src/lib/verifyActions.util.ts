import { ButtonStyle, type Guild } from "discord.js";
import { theme } from "@config/theme";
import { customId } from "@core/button";
import { UserFacingError } from "@core/errors";
import { button, row } from "@lib/components.util";
import { embed } from "@lib/embeds.util";
import { type VerifyConfig } from "@lib/verifyPanel.util";

/** What the Discord panel and the dashboard both do to verification, so neither can drift from the other. */

/** Discord refuses a role at or above the bot's own, and says nothing until the moment it has to grant it. */
export function roleTooHigh(guild: Guild, roleId: string | null): boolean {
	if (roleId === null) return false;

	const role = guild.roles.cache.get(roleId);
	const me = guild.members.me;
	if (role === undefined || me === null) return false;

	return role.managed || role.position >= me.roles.highest.position;
}

/** Posts the public panel, or edits the one already there, and answers with the message it left behind. */
export async function publishVerifyPanel(guild: Guild, config: VerifyConfig): Promise<string> {
	if (config.channelId === null) throw new UserFacingError("Pick a channel first.");

	const channel = await guild.channels.fetch(config.channelId).catch(() => null);
	if (channel?.isSendable() !== true) {
		throw new UserFacingError("I cannot post in that channel any more. Pick another one.");
	}

	const icon = guild.iconURL();
	const payload = {
		embeds: [
			embed({
				category: "settings",
				title: `${theme.emoji.verify} Verification`,
				description: config.message,
				...(icon === null ? {} : { thumbnail: icon }),
			}),
		],
		components: [
			row(
				button({
					id: customId("verify", "start"),
					label: "Verify",
					emoji: theme.emoji.verify,
					style: ButtonStyle.Success,
				}),
			),
		],
	};

	if (config.messageId !== null) {
		const existing = await channel.messages.fetch(config.messageId).catch(() => null);
		if (existing !== null) {
			await existing.edit(payload);
			return existing.id;
		}
	}

	return (await channel.send(payload)).id;
}
