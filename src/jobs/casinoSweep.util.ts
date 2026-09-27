import { type TestifyClient } from "@core/client";
import { UserFacingError, toError } from "@core/errors";
import { expiredHands } from "@database/repositories/casinoRepository";
import { blackjackMessage, hiloMessage, settleAbandoned } from "@lib/casino";

const PER_SWEEP = 25;

/** Plays out and pays every card hand left idle past its limit, so a walked-away player never loses a stake to silence. */
export async function settleIdleHands(client: TestifyClient): Promise<void> {
	const hands = await expiredHands(new Date(), PER_SWEEP);

	// One at a time, so a burst of expiries is a trickle of payouts rather than a spike of writes.
	for (const hand of hands) {
		let settled;
		try {
			settled = await settleAbandoned(hand);
		} catch (error) {
			// The player pressed a button between the listing and the claim, which settled it their way instead.
			if (error instanceof UserFacingError) continue;
			throw error;
		}

		client.logger.debug({ guildId: hand.guildId, game: hand.game }, "[CASINO] Settled an idle hand");
		if (hand.channelId === null || hand.messageId === null) continue;

		const message =
			settled.game === "blackjack"
				? blackjackMessage(settled.view, hand.userId)
				: hiloMessage(settled.view, hand.userId);

		try {
			const channel = await client.channels.fetch(hand.channelId);
			if (channel?.isTextBased() === true) await channel.messages.edit(hand.messageId, message);
		} catch (error) {
			client.logger.debug({ err: toError(error) }, "[CASINO] Could not update an idle hand's message");
		}
	}
}
