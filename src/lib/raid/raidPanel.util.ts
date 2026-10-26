import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { channelSelect, roleSelect, row } from "@lib/discord/components.util";
import { withoutPings } from "@lib/discord/containers.util";
import { type ContainerMessage } from "@lib/discord/discord.types";
import { RAID_PANEL_ID } from "@lib/raid/raid.constants";
import { hasWork } from "@lib/raid/raidActions.util";
import { settingsScreen, type ScreenRow, statusDot } from "@lib/settings/settingsScreen.util";
import { type RaidOverview } from "@testify/shared";

const days = (count: number): string => `${String(count)} ${count === 1 ? "day" : "days"}`;
const minutes = (count: number): string => (count === 1 ? "minute" : `${String(count)} minutes`);

function warnings(raid: RaidOverview): ScreenRow[] {
	const rows: ScreenRow[] = [];
	if (raid.minAccountAgeDays > 0 && !raid.canHold) {
		rows.push({ label: "⚠️ I cannot hold anybody back", value: "Give me the Moderate Members permission." });
	}
	if (raid.alertChannelId !== null && !raid.canSend) {
		rows.push({
			label: "⚠️ I cannot post alerts there",
			value: "Let me send messages in that channel, or pick another.",
		});
	}
	if (!raid.canPing) {
		rows.push({
			label: "⚠️ That role will not be pinged",
			value: "Make it mentionable, or give me Mention Everyone.",
		});
	}
	return rows;
}

export function raidPanel(
	raid: RaidOverview,
	ownerId: string,
	note?: string,
): ContainerMessage & { allowedMentions: { parse: [] } } {
	const status = raid.enabled
		? `${statusDot(true)} — new joins are being watched.`
		: hasWork(raid)
			? `${statusDot(false)} — nothing is being watched yet.`
			: `${statusDot(false)} — set a minimum account age or pick an alert channel, then turn it on.`;

	return withoutPings(
		settingsScreen({
			id: RAID_PANEL_ID,
			ownerId,
			category: "moderation",
			title: "🛡️ Raid protection",
			status,
			...(note !== undefined ? { note } : {}),
			rows: [
				{
					label: "Minimum account age",
					value:
						raid.minAccountAgeDays === 0
							? "Off — nobody is held back."
							: `Accounts newer than **${days(raid.minAccountAgeDays)}** are timed out until they are old enough, and told why.`,
					action: { action: "age", label: "Edit" },
				},
				{
					label: "Spike alert",
					value:
						raid.alertChannelId === null
							? `Pick a channel below to be told when **${String(raid.spikeJoins)}** members join within a ${minutes(raid.spikeMinutes)}.`
							: `Posted in <#${raid.alertChannelId}> when **${String(raid.spikeJoins)}** members join within a ${minutes(raid.spikeMinutes)}${raid.pingRoleId === null ? "" : `, pinging <@&${raid.pingRoleId}>`}.`,
					action: { action: "spike", label: "Edit" },
				},
				...warnings(raid),
			],
			pickers: [
				{
					label: "Alerts go to",
					hint: "Where a spike and each held account are reported. Leave it empty for no alerts.",
					control: row(
						channelSelect({
							id: customId(RAID_PANEL_ID, "channel", ownerId),
							placeholder: "Channel for alerts…",
							minValues: 0,
							...(raid.alertChannelId === null ? {} : { defaultChannelIds: [raid.alertChannelId] }),
						}),
					),
				},
				{
					label: "Ping on a spike",
					hint: "The only thing an alert ever pings. Leave it empty to ping nobody.",
					control: row(
						roleSelect({
							id: customId(RAID_PANEL_ID, "role", ownerId),
							placeholder: "Staff role to ping…",
							minValues: 0,
							...(raid.pingRoleId === null ? {} : { defaultRoleIds: [raid.pingRoleId] }),
						}),
					),
				},
			],
			actions: [
				{
					action: "toggle",
					label: raid.enabled ? "Turn off" : "Turn on",
					style: raid.enabled ? ButtonStyle.Danger : ButtonStyle.Success,
					disabled: !raid.enabled && !hasWork(raid),
				},
			],
			footer:
				"Nothing here kicks or bans. Lift a hold sooner with `/unmute`. Joins are counted in memory and never stored.",
		}),
	);
}
