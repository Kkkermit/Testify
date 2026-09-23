import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { button, linkButton, row } from "@lib/discord/components.util";
import { container, containerMessage, divider, sectionWithButton, text } from "@lib/discord/containers.util";
import { type ContainerMessage, type ContainerPart } from "@lib/discord/discord.types";
import { SUPPORT_PANEL_ID } from "@lib/support/support.constants";
import { linkTarget, type SupportArticleLink, type SupportReply, type SupportTopic } from "@testify/shared";

/** The support answer as a Discord message: the article, then a button beside each related one. */

export const TOPIC_LABELS: Record<SupportTopic, string> = {
	"getting-started": "Getting started",
	dashboard: "Using the dashboard",
	setup: "Setting up features",
	moderation: "Moderation",
	community: "Economy, games and fun",
	music: "Music",
	troubleshooting: "Fixing problems",
	commands: "Command reference",
};

export const TOPIC_EMOJI: Record<SupportTopic, string> = {
	"getting-started": "🚀",
	dashboard: "🖥️",
	setup: "⚙️",
	moderation: "🛡️",
	community: "🎉",
	music: "🎵",
	troubleshooting: "🧰",
	commands: "⌨️",
};

/** Discord caps an autocomplete choice's name at 100 characters. */
const CHOICE_NAME_MAX = 100;

export function choiceName(name: string): string {
	return name.length <= CHOICE_NAME_MAX ? name : `${name.slice(0, CHOICE_NAME_MAX - 1)}…`;
}

export function suggestionName(link: SupportArticleLink): string {
	return choiceName(`${TOPIC_EMOJI[link.topic]} ${link.title}`);
}

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** A dashboard path becomes a full link when the dashboard is on, and plain text when there is nowhere to send it. */
export function discordMarkdown(body: string, dashboard: string | null): string {
	return body.replace(LINK, (_whole, label: string, href: string) => {
		const target = linkTarget(href);
		if (target === null) return label;
		if (target.external) return `[${label}](${target.href})`;

		return dashboard === null ? label : `[${label}](${dashboard.replace(/\/$/, "")}${target.href})`;
	});
}

export interface SupportScreenOptions {
	bot: string;
	ownerId: string;
	dashboard: string | null;
	supportServer: string | null;
}

export function supportScreen(reply: SupportReply, options: SupportScreenOptions): ContainerMessage {
	const parts: ContainerPart[] = [];

	if (reply.answer === null) {
		parts.push(
			text("## No article for that"),
			text(
				`I can only help with ${options.bot}: its dashboard, adding it to a server, setting it up and its commands.\n\nTry asking in other words — \`/ask\` suggests articles as you type${reply.related.length > 0 ? ", or open one of these" : ""}.`,
			),
		);
	} else {
		const { topic, title, body } = reply.answer;
		parts.push(
			text(`-# ${TOPIC_EMOJI[topic]} ${TOPIC_LABELS[topic]}\n## ${title}`),
			text(discordMarkdown(body, options.dashboard)),
		);
	}

	if (reply.related.length > 0) {
		parts.push(divider(), text("### Related"));
		for (const link of reply.related) {
			parts.push(
				sectionWithButton(
					suggestionName(link),
					button({
						id: customId(SUPPORT_PANEL_ID, "open", link.id, options.ownerId),
						label: "Open",
						style: ButtonStyle.Secondary,
					}),
				),
			);
		}
	}

	const links = [
		...(options.dashboard === null
			? []
			: [linkButton("Help page", `${options.dashboard.replace(/\/$/, "")}/help`, "📖")]),
		...(options.supportServer === null ? [] : [linkButton("Support server", options.supportServer, "💬")]),
	];
	if (links.length > 0) parts.push(divider(), row(...links));

	parts.push(text("-# Every answer is a written help article, so nothing here is made up."));
	return containerMessage(container({ category: "info", parts }));
}
