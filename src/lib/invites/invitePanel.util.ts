import { customId } from "@core/button";
import { type StoredStanding } from "@database/repositories/inviteRepository";
import { channelSelect, row } from "@lib/discord/components.util";
import { type ContainerMessage } from "@lib/discord/discord.types";
import { INVITE_SETTINGS_ID } from "@lib/invites/invites.constants";
import { settingsScreen, statusDot, switchAction } from "@lib/settings/settingsScreen.util";
import { type InviteSettings } from "@testify/shared";

/** `/invites settings`: the switch and where each join is announced, applied on the press. */
export function inviteSettingsPanel(settings: InviteSettings, ownerId: string, note?: string): ContainerMessage {
	const status = !settings.canRead
		? `${statusDot(false)} — I need the Manage Server permission to see which invite each member used.`
		: settings.enabled
			? `${statusDot(true)} — each new member's invite is recorded${settings.logChannelId === null ? "." : `, and announced in <#${settings.logChannelId}>.`}`
			: `${statusDot(false)} — joins are not being recorded.`;

	return settingsScreen({
		id: INVITE_SETTINGS_ID,
		ownerId,
		category: "community",
		title: "📨 Invite tracking",
		status,
		...(note !== undefined ? { note } : {}),
		rows:
			settings.logChannelId !== null && !settings.canSend
				? [{ label: "⚠️ I cannot post there", value: "Let me send messages in that channel, or pick another." }]
				: [],
		pickers: [
			{
				label: "Announce joins in",
				hint: "Optional. Each join says whose invite it was. Nobody is pinged.",
				control: row(
					channelSelect({
						id: customId(INVITE_SETTINGS_ID, "channel", ownerId),
						placeholder: "No announcements",
						minValues: 0,
						...(settings.logChannelId === null ? {} : { defaultChannelIds: [settings.logChannelId] }),
					}),
				),
			},
		],
		actions: [switchAction(settings.enabled, settings.canRead)],
		footer: "Counting starts when it is turned on; members who joined before then are not counted.",
	});
}

/** One line per inviter on `/invites top`, ranked by the members who stayed. */
export function standingLines(top: readonly StoredStanding[]): string {
	if (top.length === 0) return "Nobody has brought anybody in yet, as far as I have seen.";

	return top
		.map(
			(standing, index) =>
				`**${String(index + 1)}.** <@${standing.inviterId}> — ${String(standing.joins - standing.left)} still here, ${String(standing.left)} left`,
		)
		.join("\n");
}
