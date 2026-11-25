import { randomInt } from "node:crypto";
import {
	type ActionRowBuilder,
	ButtonStyle,
	type EmbedBuilder,
	type MessageActionRowComponentBuilder,
} from "discord.js";
import { ECONOMY } from "@config/constants";
import { customId } from "@core/button";
import { adjustWallet, debitWallet, incrementCounters, setCooldown } from "@database/repositories/economyRepository";
import { button, row } from "@lib/discord/components.util";
import { embed } from "@lib/discord/embeds.util";
import { HEIST_ID } from "@lib/economy/economy.constants";
import { type HeistState } from "@lib/economy/economy.types";
import { activeHeists } from "@lib/economy/heistState.util";
import { discordTime, formatNumber } from "@lib/format/format.util";

interface HeistPost {
	embeds: EmbedBuilder[];
	components?: ActionRowBuilder<MessageActionRowComponentBuilder>[];
}

/** The heist's own message while the crew forms: who is in, the stake, when it starts, and the buttons. */
export function heistForming(state: HeistState): HeistPost {
	const closesAt = state.startedAt + ECONOMY.heistJoinWindowMs;

	return {
		embeds: [
			embed({
				category: "economy",
				title: "🎭 A heist is forming",
				description: `<@${state.leaderId}> is putting a crew together. It starts ${discordTime(closesAt, "R")}, or when they press **Start now**.`,
				fields: [
					{ name: "Stake", value: `**${formatNumber(state.stake)}** each`, inline: true },
					{
						name: "Crew",
						value: `${String(state.participants.size)} of ${String(ECONOMY.heistMaxPlayers)}`,
						inline: true,
					},
					{ name: "Needs", value: `At least ${String(ECONOMY.heistMinPlayers)}`, inline: true },
					{ name: "In the crew", value: [...state.participants].map((id) => `<@${id}>`).join(", ") },
				],
			}),
		],
		components: [
			row(
				button({ id: customId(HEIST_ID, "join", state.guildId), label: "Join the crew", style: ButtonStyle.Success }),
				button({
					id: customId(HEIST_ID, "start", state.guildId, state.leaderId),
					label: "Start now",
					style: ButtonStyle.Primary,
				}),
			),
		],
	};
}

/** Takes the server's heist out of the waiting list and plays it; nothing happens if it already started. */
export async function finishHeist(guildId: string, post: (message: HeistPost) => Promise<unknown>): Promise<void> {
	const heists = activeHeists();
	const state = heists.get(guildId);
	if (state === undefined) return;
	heists.delete(guildId);

	if (state.participants.size < ECONOMY.heistMinPlayers) {
		await post(calledOff(`Not enough people joined. A heist needs at least ${String(ECONOMY.heistMinPlayers)}.`));
		return;
	}

	const paid: string[] = [];
	for (const userId of state.participants) {
		if (await debitWallet(state.guildId, userId, state.stake)) paid.push(userId);
	}

	if (paid.length < ECONOMY.heistMinPlayers) {
		for (const userId of paid) await adjustWallet(state.guildId, userId, state.stake);
		await post(calledOff("Too many of the crew could not cover the stake, so everybody has been refunded."));
		return;
	}

	// More people means better odds, capped so a full crew is not a guaranteed win.
	const chance = Math.min(0.75, 0.3 + paid.length * 0.08);
	const succeeded = Math.random() < chance;
	const pot = state.stake * paid.length;

	for (const userId of paid) {
		await setCooldown(state.guildId, userId, "heist", new Date());
		await incrementCounters(state.guildId, userId, succeeded ? { heistSuccess: 1 } : { heistFailed: 1 });
	}

	const crew = { name: "Crew", value: paid.map((id) => `<@${id}>`).join(", ") };

	if (!succeeded) {
		await post({
			embeds: [
				embed({
					category: "economy",
					title: "🚨 The heist failed",
					description: `Security caught the crew, and the pot of **${formatNumber(pot)}** is gone.`,
					fields: [{ name: "Each member lost", value: formatNumber(state.stake), inline: true }, crew],
				}),
			],
		});
		return;
	}

	const multiplier = 1.5 + randomInt(0, 100) / 100;
	const payout = Math.floor((pot * multiplier) / paid.length);

	for (const userId of paid) await adjustWallet(state.guildId, userId, payout);

	await post({
		embeds: [
			embed({
				category: "economy",
				title: "💰 The heist succeeded",
				description: `The crew got away with **${formatNumber(payout * paid.length)}**.`,
				fields: [
					{ name: "Each member gets", value: `**${formatNumber(payout)}**`, inline: true },
					{ name: "Profit each", value: `+${formatNumber(payout - state.stake)}`, inline: true },
					crew,
				],
			}),
		],
	});
}

function calledOff(reason: string): HeistPost {
	return { embeds: [embed({ category: "economy", title: "🎭 Heist called off", description: reason })] };
}
