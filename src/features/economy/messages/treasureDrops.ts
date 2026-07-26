import { randomInt } from "node:crypto";
import { Category } from "../../../config/categories";
import { defineMessageProcessor } from "../../../core/messagePipeline";
import { adjustWallet } from "../../../database/repositories/economyRepository";
import { getTreasureConfig } from "../../../database/repositories/settingsRepository";
import { embed } from "../../../ui/embeds";
import { formatNumber } from "../../../ui/format";

interface DropState {
	messagesUntilDrop: number;
	lastDropAt: number;
}

const STATE_KEY = "economy:treasure";

export default defineMessageProcessor({
	name: "treasureDrops",
	order: 70,
	async run(client, message) {
		if (!message.guild) return;

		const config = await getTreasureConfig(message.guild.id);
		if (!config?.isEnabled) return;

		const states = client.featureState(STATE_KEY, () => new Map<string, DropState>());
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
					category: Category.Economy,
					title: "\u{1f4b0} Treasure found",
					description: `${message.author} stumbled across **${formatNumber(amount)}** and pocketed it.`,
				}),
			],
		});
	},
});
