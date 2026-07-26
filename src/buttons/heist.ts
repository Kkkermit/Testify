import { ECONOMY } from "../config/constants";
import { defineButton } from "../core/button";
import { UserFacingError } from "../core/errors";
import { findAccount } from "../database/repositories/economyRepository";
import { embed } from "../lib/embeds";
import { formatNumber } from "../lib/format";
import { activeHeists } from "../lib/heistState";

export default defineButton({
	id: "heist",

	async run(interaction, context) {
		if (!interaction.isButton()) return;

		const [guildId] = context.args;
		if (guildId === undefined) throw new UserFacingError("That heist has already finished.");

		const heists = activeHeists();
		const state = heists.get(guildId);
		if (!state) throw new UserFacingError("That heist has already finished.");

		if (context.action === "start") {
			const [, leaderId] = context.args;
			if (leaderId !== interaction.user.id) {
				throw new UserFacingError("Only the person who started the heist can begin it early.");
			}
			context.client.timers.stop(`heist:${guildId}`);
			await interaction.deferUpdate();
			return;
		}

		if (context.action !== "join") return;

		if (state.participants.has(interaction.user.id)) {
			throw new UserFacingError("You are already part of this crew.");
		}
		if (state.participants.size >= ECONOMY.heistMaxPlayers) {
			throw new UserFacingError("This crew is already full.");
		}

		const account = await findAccount(guildId, interaction.user.id);
		if (!account || account.wallet < state.stake) {
			throw new UserFacingError(`You need **${formatNumber(state.stake)}** in your wallet to join.`);
		}

		state.participants.add(interaction.user.id);

		await interaction.update({
			embeds: [
				embed({
					category: "economy",
					title: "\u{1f3ad} Heist forming",
					description: [
						`<@${state.leaderId}> is putting a crew together.`,
						"",
						`**Stake:** ${formatNumber(state.stake)} each`,
						`**Crew:** ${state.participants.size} / ${ECONOMY.heistMaxPlayers}`,
						"",
						[...state.participants].map((id) => `<@${id}>`).join(", "),
					].join("\n"),
				}),
			],
		});
	},
});
