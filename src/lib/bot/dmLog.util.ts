import { type BaseMessageOptions, ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { logAuthor, type LoggedUser, loggedUserText } from "@lib/bot/logFields.util";
import { button, row } from "@lib/discord/components.util";
import { embed } from "@lib/discord/embeds.util";
import { discordTime, escapeMarkdown, truncate } from "@lib/format/format.util";

/** The post a direct message to the bot becomes in the DM log, and the controls under it. */

export const DM_LOG_ID = "dmlog";

export interface LoggedDirectMessage {
	content: string;
	sentAt: Date;
	attachmentUrls: readonly string[];
}

/** The file's own name, read from its address, since only the address is kept. */
export function attachmentName(url: string): string {
	const path = url.split("?")[0] ?? url;
	return decodeURIComponent(path.slice(path.lastIndexOf("/") + 1)) || "attachment";
}

function isImage(url: string): boolean {
	return /\.(?:png|jpe?g|gif|webp)$/i.test(url.split("?")[0] ?? "");
}

/** Where the reader is: the message itself, or the sender's details. */
export type DmLogView = "message" | "user";

export function dmLogRow(authorId: string, view: DmLogView): ReturnType<typeof row>[] {
	return [
		row(
			view === "message"
				? button({ id: customId(DM_LOG_ID, "info", authorId), label: "User info", style: ButtonStyle.Primary })
				: button({
						id: customId(DM_LOG_ID, "back", authorId),
						label: "Back to message",
						emoji: "↩️",
						style: ButtonStyle.Secondary,
					}),
			button({ id: customId(DM_LOG_ID, "reply", authorId), label: "Reply", style: ButtonStyle.Success }),
		),
	];
}

export function dmLogMessage(author: LoggedUser, dm: LoggedDirectMessage): BaseMessageOptions {
	const image = dm.attachmentUrls.find(isImage);

	return {
		embeds: [
			embed({
				category: "info",
				author: logAuthor(author),
				title: "📨 Direct message received",
				description: truncate(dm.content || "*No text content.*", 2_000),
				fields: [
					{ name: "From", value: loggedUserText(author), inline: true },
					{
						name: "Sent",
						value: `${discordTime(dm.sentAt, "F")}\n-# ${discordTime(dm.sentAt, "R")}`,
						inline: true,
					},
					...(dm.attachmentUrls.length > 0
						? [
								{
									name: `Attachments (${String(dm.attachmentUrls.length)})`,
									value: dm.attachmentUrls
										.map((url) => `[${escapeMarkdown(attachmentName(url))}](${url})`)
										.join("\n")
										.slice(0, 1_024),
								},
							]
						: []),
				],
				thumbnail: author.avatarUrl,
				footer: `User ID ${author.id}`,
				...(image !== undefined ? { image } : {}),
			}),
		],
		components: dmLogRow(author.id, "message"),
		allowedMentions: { parse: [] },
	};
}
