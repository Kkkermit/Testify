import {
	type EmbedBuilder,
	type Message,
	type MessageCreateOptions,
	MessageFlags,
	MessageFlagsBitField,
	type MessageFlagsResolvable,
	TextDisplayBuilder,
} from "discord.js";
import { type TestifyClient } from "@core/client";
import { TIDY_AFTER_MS } from "@lib/discord/discord.constants";

/** Replies that clean up after themselves. */

export function cleanupFooter(afterMs: number = TIDY_AFTER_MS): string {
	const seconds = Math.max(1, Math.round(afterMs / 1_000));
	return `This message disappears in ${seconds} second${seconds === 1 ? "" : "s"}.`;
}

/** Replies with the embed, then deletes the reply. */
export async function replyTemporarily(
	client: TestifyClient,
	message: Message,
	content: EmbedBuilder,
	afterMs: number = TIDY_AFTER_MS,
): Promise<void> {
	const sent = await message.reply({ embeds: [content.setFooter({ text: cleanupFooter(afterMs) })] });

	client.timers.after(`tidy:${sent.id}`, afterMs, async () => {
		await sent.delete().catch(() => null);
	});
}

/** Counted down by the reader's own client, so it stays right while the message sits there. */
export function tidyNote(deadline: number): string {
	return `-# This message will be deleted <t:${String(Math.ceil(deadline / 1_000))}:R>.`;
}

/** Adds the note where the message can show it: as content, or as the last component of a V2 message. */
export function withTidyNote<T extends Pick<MessageCreateOptions, "content" | "components" | "flags">>(
	payload: T,
	note: string,
): T {
	const flags = new MessageFlagsBitField((payload.flags ?? 0) as MessageFlagsResolvable);
	if (flags.has(MessageFlags.IsComponentsV2)) {
		return { ...payload, components: [...(payload.components ?? []), new TextDisplayBuilder().setContent(note)] };
	}

	const content = typeof payload.content === "string" && payload.content !== "" ? `${payload.content}\n${note}` : note;
	return { ...payload, content };
}
