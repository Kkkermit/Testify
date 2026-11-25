import { PermissionFlagsBits } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { resetGuild } from "@database/repositories/economyRepository";
import { resetGuildLevels } from "@database/repositories/levelRepository";
import { successEmbed } from "@lib/discord";
import { formatNumber } from "@lib/format";

const counted = (count: number, one: string, many: string): string =>
	`**${formatNumber(count)}** ${count === 1 ? one : many}`;

export default defineButton({
	id: "reset",
	ownerOnly: true,

	async run(interaction, context) {
		if (!interaction.isButton()) return;

		const guildId = interaction.guildId;
		if (guildId === null) throw new UserFacingError("This only works inside a server.");

		if (context.action.endsWith("-no")) {
			await interaction.update({ embeds: [successEmbed("Cancelled. Nothing was deleted.")], components: [] });
			return;
		}

		// Asked again on the press, since the confirmation can sit open while somebody's roles change.
		if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) !== true) {
			throw new UserFacingError("You need the Administrator permission to reset this server.");
		}

		if (context.action === "economy-yes") {
			const removed = await resetGuild(guildId);
			await interaction.update({
				embeds: [successEmbed(`Deleted ${counted(removed, "economy account", "economy accounts")}.`)],
				components: [],
			});
			return;
		}

		if (context.action === "levels-yes") {
			const removed = await resetGuildLevels(guildId);
			await interaction.update({
				embeds: [successEmbed(`Reset ${counted(removed, "member's level", "members' levels")} to zero.`)],
				components: [],
			});
		}
	},
});
