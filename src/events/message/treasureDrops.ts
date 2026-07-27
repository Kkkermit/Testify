import { randomInt } from "node:crypto";
import { defineMessageHandler } from "@core/message";
import { adjustWallet } from "@database/repositories/economyRepository";
import { getTreasureConfig } from "@database/repositories/settingsRepository";
import { embed } from "@lib/embeds";
import { formatNumber } from "@lib/format";

interface DropState {
	messagesUntilDrop: number;
	lastDropAt: number;
}

const states = new Map<string, DropState>();

export default defineMessageHandler({
	name: "treasureDrops",
	order: 70,
	async run(message) {
		if (!message.guild) return;

		const config = await getTreasureConfig(message.guild.id);
		if (!config?.isEnabled) return;

		const state = states.get(message.guild.id) ?? {
			messagesUntilDrop: randomInt(config.minMessages, config.maxMessages + 1),
			lastDropAt: 0,
		};

		state.messagesUntilDrop -= 1;

		if (state.messagesUntilDrop > 0 || Date.now() - state.lastDropAt < config.cooldownMs) {
			states.set(message.guild.id, state);
			return;
		}

		const amount = randomInt(config.minAmount, config.maxAmount + 1);
		await adjustWallet(message.guild.id, message.author.id, amount);

		states.set(message.guild.id, {
			messagesUntilDrop: randomInt(config.minMessages, config.maxMessages + 1),
			lastDropAt: Date.now(),
		});

		if (!message.channel.isSendable()) return;

		await message.channel.send({
			embeds: [
				embed({
					category: "economy",
					title: "\u{1f4b0} Treasure found",
					description: `${message.author} stumbled across **${formatNumber(amount)}** and pocketed it.`,
				}),
			],
		});
	},
});
