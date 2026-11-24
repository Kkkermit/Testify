import { ECONOMY, ECONOMY_COOLDOWNS } from "@config/constants";
import { defineButton } from "@core/button";
import { checkOpenControl, refusalText } from "@core/checks";
import { UserFacingError } from "@core/errors";
import { findAccount } from "@database/repositories/economyRepository";
import { activeHeists, finishHeist, HEIST_ID, heistForming } from "@lib/economy";
import { formatDuration, formatNumber } from "@lib/format";

export default defineButton({
	id: HEIST_ID,

	async run(interaction, context) {
		if (!interaction.isButton()) return;

		const [guildId] = context.args;
		const state = guildId === undefined ? undefined : activeHeists().get(guildId);
		if (guildId === undefined || state === undefined) throw new UserFacingError("That heist has already finished.");

		const refused = await checkOpenControl(context.client, { userId: interaction.user.id, guildId }, "heist");
		if (refused !== null) throw new UserFacingError(refusalText(refused));

		if (context.action === "start") {
			const [, leaderId] = context.args;
			if (leaderId !== interaction.user.id) {
				throw new UserFacingError("Only the person who started the heist can begin it early.");
			}

			context.client.timers.stop(`heist:${guildId}`);
			await interaction.update({ components: [] });
			await finishHeist(guildId, (message) => interaction.followUp({ ...message, allowedMentions: { parse: [] } }));
			return;
		}

		if (context.action !== "join") return;

		if (state.participants.has(interaction.user.id)) throw new UserFacingError("You are already part of this crew.");
		if (state.participants.size >= ECONOMY.heistMaxPlayers) throw new UserFacingError("This crew is already full.");

		const account = await findAccount(guildId, interaction.user.id);
		if (!account || account.wallet < state.stake) {
			throw new UserFacingError(`You need **${formatNumber(state.stake)}** in your wallet to join.`);
		}

		const readyAt = (account.lastHeist?.getTime() ?? 0) + ECONOMY_COOLDOWNS.heist;
		if (Date.now() < readyAt) {
			throw new UserFacingError(
				`The heat has not died down for you. Try again in **${formatDuration(readyAt - Date.now())}**.`,
			);
		}

		// Asked again after the wallet was read, since the heist can play, or the crew fill, meanwhile.
		if (activeHeists().get(guildId) !== state) throw new UserFacingError("That heist has already finished.");
		if (state.participants.size >= ECONOMY.heistMaxPlayers) throw new UserFacingError("This crew is already full.");

		state.participants.add(interaction.user.id);
		await interaction.update({ ...heistForming(state), allowedMentions: { parse: [] } });
	},
});
