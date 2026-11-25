import { ECONOMY, ECONOMY_COOLDOWNS } from "@config/constants";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { getOrCreateAccount } from "@database/repositories/economyRepository";
import { reply } from "@lib/discord";
import { activeHeists, finishHeist, type HeistState, heistForming } from "@lib/economy";
import { formatDuration, formatNumber } from "@lib/format";

const MIN_STAKE = 100;
const DEFAULT_STAKE = 500;

export default defineCommand({
	name: "heist",
	description: "Starts a group heist that other members can join.",
	category: "economy",
	guildOnly: true,
	options: [
		{
			name: "stake",
			description: `How much each member puts in, from ${formatNumber(MIN_STAKE)}. ${formatNumber(DEFAULT_STAKE)} unless you say.`,
			type: "integer",
			min: MIN_STAKE,
			max: 100_000,
		},
	],

	async run(interaction, client) {
		const guild = inGuild(interaction);
		const account = await getOrCreateAccount(guild.id, interaction.user.id);
		const now = Date.now();

		if (account.lastHeist !== null) {
			const readyAt = account.lastHeist.getTime() + ECONOMY_COOLDOWNS.heist;
			if (now < readyAt) {
				throw new UserFacingError(`The heat has not died down. Try again in **${formatDuration(readyAt - now)}**.`);
			}
		}

		const heists = activeHeists();
		if (heists.has(guild.id)) throw new UserFacingError("A heist is already being organised in this server.");

		const stake = interaction.options.getInteger("stake") ?? DEFAULT_STAKE;
		if (account.wallet < stake) {
			throw new UserFacingError(`You need **${formatNumber(stake)}** in your wallet to start this.`);
		}

		const state: HeistState = {
			guildId: guild.id,
			leaderId: interaction.user.id,
			stake,
			participants: new Set([interaction.user.id]),
			startedAt: now,
			messageId: null,
		};
		heists.set(guild.id, state);

		await reply(interaction, { ...heistForming(state), allowedMentions: { parse: [] } });
		state.messageId = (await interaction.fetchReply()).id;

		client.timers.after(`heist:${guild.id}`, ECONOMY.heistJoinWindowMs, () =>
			finishHeist(guild.id, async (message) => {
				// A message somebody deleted has no buttons left to take away.
				await interaction.editReply({ components: [] }).catch(() => undefined);
				return interaction.followUp({ ...message, allowedMentions: { parse: [] } });
			}),
		);
	},
});
