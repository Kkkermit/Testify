import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { button } from "@lib/discord/components.util";
import { container, containerMessage, divider, sectionWithButton, text } from "@lib/discord/containers.util";
import { type ContainerMessage, type ContainerPart } from "@lib/discord/discord.types";
import { SUPPORT_PANEL_ID } from "@lib/support/support.constants";
import { linkTarget, type SupportReply } from "@testify/shared";

/** The support answer as a Discord message: the article, then a button beside each related one. */

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
}

export function supportScreen(reply: SupportReply, options: SupportScreenOptions): ContainerMessage {
	const parts: ContainerPart[] = [];

	if (reply.answer === null) {
		parts.push(
			text("## No article for that"),
			text(
				`I can only help with ${options.bot}: its dashboard, adding it to a server, setting it up and its commands. Try asking in other words${reply.related.length > 0 ? ", or open one of these" : ""}.`,
			),
		);
	} else {
		parts.push(text(`## ${reply.answer.title}`), text(discordMarkdown(reply.answer.body, options.dashboard)));
	}

	if (reply.related.length > 0) {
		parts.push(divider(), text("**Related**"));
		for (const link of reply.related) {
			parts.push(
				sectionWithButton(
					link.title,
					button({
						id: customId(SUPPORT_PANEL_ID, "open", link.id, options.ownerId),
						label: "Open",
						style: ButtonStyle.Secondary,
					}),
				),
			);
		}
	}

	parts.push(text("-# Every answer is a written help article; nothing here is generated."));
	return containerMessage(container({ category: "info", parts }));
}
