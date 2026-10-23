import { ButtonStyle } from "discord.js";
import { theme } from "@config/theme";
import { customId } from "@core/button";
import { type StoredIdea } from "@database/repositories/ideaRepository";
import { button, channelSelect, row } from "@lib/discord/components.util";
import { container, containerMessage, divider, text } from "@lib/discord/containers.util";
import { type ContainerMessage, type ContainerPart } from "@lib/discord/discord.types";
import { IDEA_ID, IDEA_SETTINGS_ID } from "@lib/ideas/ideas.constants";
import { settingsScreen, statusDot } from "@lib/settings/settingsScreen.util";
import { type IdeaSettings, type IdeaStatus } from "@testify/shared";

const seconds = (date: Date): string => String(Math.floor(date.getTime() / 1_000));

function quoted(value: string): string {
	return value
		.split("\n")
		.map((line) => `> ${line}`)
		.join("\n");
}

const STATUS_WORD: Record<Exclude<IdeaStatus, "open">, string> = {
	accepted: "✅ **Accepted**",
	declined: "❌ **Declined**",
};

const STATUS_ACCENT = { accepted: theme.colours.success, declined: theme.colours.error } as const;

export function ideaStatusLine(idea: Pick<StoredIdea, "status" | "reason" | "decidedByName" | "decidedAt">): string {
	if (idea.status === "open") return "🟡 **Open** — vote with the buttons below.";

	const by = idea.decidedByName === null ? "" : ` by ${idea.decidedByName}`;
	const when = idea.decidedAt === null ? "" : ` <t:${seconds(idea.decidedAt)}:R>`;
	const line = `${STATUS_WORD[idea.status]}${by}${when}`;

	return idea.reason === "" ? line : `${line}\n${quoted(idea.reason)}`;
}

/** The post members vote on; the same for everybody, so staff buttons are refused rather than hidden. */
export function ideaPost(idea: StoredIdea): ContainerMessage {
	const open = idea.status === "open";
	const vote = (side: "up" | "down", count: number, emoji: string): ReturnType<typeof button> =>
		button({ id: customId(IDEA_ID, side, idea.id), label: String(count), emoji, disabled: !open });

	const staff = open
		? [
				button({ id: customId(IDEA_ID, "accept", idea.id), label: "Accept", style: ButtonStyle.Success }),
				button({ id: customId(IDEA_ID, "decline", idea.id), label: "Decline", style: ButtonStyle.Danger }),
			]
		: [
				button({
					id: customId(IDEA_ID, idea.status === "accepted" ? "decline" : "accept", idea.id),
					label: idea.status === "accepted" ? "Decline" : "Accept",
				}),
				button({ id: customId(IDEA_ID, "reopen", idea.id), label: "Reopen" }),
			];

	const parts: ContainerPart[] = [
		text(`## 💡 Idea #${String(idea.number)}\n${idea.text}`),
		text(`-# From <@${idea.authorId}> (${idea.authorName}) · <t:${seconds(idea.createdAt)}:R>`),
		divider(),
		text(ideaStatusLine(idea)),
		row(vote("up", idea.upVoters.length, "👍"), vote("down", idea.downVoters.length, "👎"), ...staff),
	];

	return containerMessage(
		container(
			idea.status === "open" ? { category: "community", parts } : { accent: STATUS_ACCENT[idea.status], parts },
		),
	);
}

/** The private note staff get on deciding, and the DM the idea's author gets. */
export function decisionText(idea: StoredIdea, guildName: string, link: string | null): string {
	const verb = idea.status === "accepted" ? "accepted" : idea.status === "declined" ? "declined" : "reopened";
	const lines = [`💡 Your idea #${String(idea.number)} in **${guildName}** was ${verb}.`];
	if (idea.reason !== "") lines.push(quoted(idea.reason));
	if (link !== null) lines.push(`-# ${link}`);

	return lines.join("\n");
}

/** `/idea settings`: the switch, the channel and how many ideas stand where, each applied on the press. */
export function ideaSettingsPanel(settings: IdeaSettings, ownerId: string, note?: string): ContainerMessage {
	const { counts } = settings;
	const status = settings.enabled
		? `${statusDot(true)} — ideas are posted in <#${settings.channelId ?? ""}>.`
		: settings.channelId === null
			? `${statusDot(false)} — pick a channel below, then turn it on.`
			: `${statusDot(false)} — members cannot post ideas yet.`;

	return settingsScreen({
		id: IDEA_SETTINGS_ID,
		ownerId,
		category: "community",
		title: "💡 Idea board",
		status,
		...(note !== undefined ? { note } : {}),
		rows: [
			{
				label: "Ideas so far",
				value: `${String(counts.open)} open · ${String(counts.accepted)} accepted · ${String(counts.declined)} declined`,
			},
			...(settings.channelId !== null && !settings.canSend
				? [{ label: "⚠️ I cannot post there", value: "Let me send messages in that channel, or pick another." }]
				: []),
		],
		pickers: [
			{
				label: "Posted in",
				hint: "Each idea becomes a post here, with buttons to vote on it.",
				control: row(
					channelSelect({
						id: customId(IDEA_SETTINGS_ID, "channel", ownerId),
						placeholder: "Channel for ideas…",
						...(settings.channelId === null ? {} : { defaultChannelIds: [settings.channelId] }),
					}),
				),
			},
		],
		actions: [
			{
				action: "toggle",
				label: settings.enabled ? "Turn off" : "Turn on",
				style: settings.enabled ? ButtonStyle.Danger : ButtonStyle.Success,
				disabled: !settings.enabled && settings.channelId === null,
			},
		],
		footer:
			"Members post with `/idea submit`. Staff with Manage Server accept or decline them. `/suggest` is different: it goes to the bot's developers.",
	});
}
