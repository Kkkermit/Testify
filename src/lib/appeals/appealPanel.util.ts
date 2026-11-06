import { ButtonStyle } from "discord.js";
import { theme } from "@config/theme";
import { customId } from "@core/button";
import { type StoredAppeal } from "@database/repositories/appealRepository";
import { APPEAL_ID, APPEAL_SETTINGS_ID } from "@lib/appeals/appeals.constants";
import { button, channelSelect, option, row, select } from "@lib/discord/components.util";
import { container, containerMessage, divider, text } from "@lib/discord/containers.util";
import { type ContainerMessage, type ContainerPart } from "@lib/discord/discord.types";
import { settingsScreen, statusDot, switchAction } from "@lib/settings/settingsScreen.util";
import { APPEAL_LIMITS, type AppealSettings } from "@testify/shared";

const seconds = (date: Date): string => String(Math.floor(date.getTime() / 1_000));

function quoted(value: string): string {
	return value
		.split("\n")
		.map((line) => `> ${line}`)
		.join("\n");
}

function statusLine(appeal: StoredAppeal): string {
	if (appeal.status === "open") return "🟡 **Waiting** for somebody with Ban Members to decide.";

	const word = appeal.status === "accepted" ? "✅ **Accepted** — the ban was lifted" : "❌ **Refused**";
	const by = appeal.decidedByName === null ? "" : ` by ${appeal.decidedByName}`;
	const when = appeal.decidedAt === null ? "" : ` <t:${seconds(appeal.decidedAt)}:R>`;
	const line = `${word}${by}${when}`;

	return appeal.reason === "" ? line : `${line}\n${quoted(appeal.reason)}`;
}

/** What staff are shown in the appeals channel; the buttons go once it is decided. */
export function appealPost(appeal: StoredAppeal): ContainerMessage {
	const parts: ContainerPart[] = [
		text(`## ⚖️ Ban appeal\n${appeal.text}`),
		text(`-# From <@${appeal.userId}> (${appeal.username}) · ${appeal.userId} · <t:${seconds(appeal.createdAt)}:R>`),
		divider(),
		text(statusLine(appeal)),
	];

	if (appeal.status === "open") {
		parts.push(
			row(
				button({
					id: customId(APPEAL_ID, "accept", appeal.id),
					label: "Accept and unban",
					style: ButtonStyle.Success,
				}),
				button({ id: customId(APPEAL_ID, "refuse", appeal.id), label: "Refuse", style: ButtonStyle.Danger }),
			),
		);
	}

	const accent = appeal.status === "accepted" ? theme.colours.success : theme.colours.error;
	return containerMessage(container(appeal.status === "open" ? { category: "moderation", parts } : { accent, parts }));
}

/** The direct message the person gets; they may share no server with the bot any more, so it often cannot arrive. */
export function appealDecisionText(appeal: StoredAppeal, guildName: string): string {
	const lines = [
		appeal.status === "accepted"
			? `⚖️ Your appeal to **${guildName}** was accepted, and your ban has been lifted.`
			: `⚖️ Your appeal to **${guildName}** was refused.`,
	];
	if (appeal.reason !== "") lines.push(quoted(appeal.reason));

	return lines.join("\n");
}

function cooldownLabel(days: number): string {
	return `${String(days)} days after a refusal`;
}

/** `/appeals`: the switch, the staff channel and the pause after a refusal, each applied on the press. */
export function appealSettingsPanel(settings: AppealSettings, ownerId: string, note?: string): ContainerMessage {
	const status = !settings.dashboard
		? `${statusDot(false)} — appeals are written on the web dashboard, which this bot does not run.`
		: settings.enabled
			? `${statusDot(true)} — appeals are shown to staff in <#${settings.channelId ?? ""}>.`
			: settings.channelId === null
				? `${statusDot(false)} — pick a channel below, then turn it on.`
				: `${statusDot(false)} — banned members cannot appeal yet.`;

	return settingsScreen({
		id: APPEAL_SETTINGS_ID,
		ownerId,
		category: "moderation",
		title: "⚖️ Ban appeals",
		status,
		...(note !== undefined ? { note } : {}),
		rows: [
			{ label: "Waiting for a decision", value: String(settings.open) },
			...(settings.channelId !== null && !settings.canSend
				? [{ label: "⚠️ I cannot post there", value: "Let me send messages in that channel, or pick another." }]
				: []),
		],
		pickers: [
			{
				label: "Shown to staff in",
				hint: "Each appeal is posted here, with buttons to accept or refuse it. Keep it to staff.",
				control: row(
					channelSelect({
						id: customId(APPEAL_SETTINGS_ID, "channel", ownerId),
						placeholder: "Channel for appeals…",
						...(settings.channelId === null ? {} : { defaultChannelIds: [settings.channelId] }),
					}),
				),
			},
			{
				label: "After a refusal",
				hint: "How long somebody waits before they can appeal again.",
				control: row(
					select({
						id: customId(APPEAL_SETTINGS_ID, "cooldown", ownerId),
						options: APPEAL_LIMITS.cooldownChoices.map((days) =>
							option({
								label: cooldownLabel(days),
								value: String(days),
								selected: days === settings.cooldownDays,
							}),
						),
					}),
				),
			},
		],
		actions: [switchAction(settings.enabled, settings.channelId !== null && settings.dashboard)],
		footer:
			"A banned member signs in to the dashboard and writes an appeal there. Staff with Ban Members accept or refuse it, and accepting lifts the ban.",
	});
}
