import { type EmbedBuilder, type Message } from "discord.js";
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
