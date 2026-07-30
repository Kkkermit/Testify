import { type EmbedBuilder, type Message } from "discord.js";
import { type TestifyClient } from "@core/client";

/**
 * Replies that clean up after themselves.
 *
 * A telling-off in a busy channel is worth reading once and then getting out of
 * the way — counting channels in particular fill with "you cannot count twice in a
 * row" until the actual numbers are hard to find.
 *
 * The notice says when it will go, because a message that vanishes with no warning
 * reads as the bot having glitched rather than having tidied up.
 */

export const TIDY_AFTER_MS = 8_000;

export function cleanupFooter(afterMs: number = TIDY_AFTER_MS): string {
	const seconds = Math.max(1, Math.round(afterMs / 1_000));
	return `This message disappears in ${seconds} second${seconds === 1 ? "" : "s"}.`;
}

/**
 * Replies with the embed, then deletes the reply.
 *
 * The delete is scheduled through the client's timer registry rather than a bare
 * `setTimeout`, so a shutdown cancels it instead of leaving the process alive.
 */
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
