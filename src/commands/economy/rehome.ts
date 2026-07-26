import { defineCommand, inGuild } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { adjustWallet, requireAccount, setFields } from "../../database/repositories/economyRepository";
import { successEmbed } from "../../lib/embeds";
import { formatNumber } from "../../lib/format";
import { findPet } from "../../lib/pets";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "rehome",
	description: "Rehomes your pet for half of what you paid.",
	category: "economy",
	guildOnly: true,

	async run(interaction) {
		const guild = inGuild(interaction);
		const account = await requireAccount(guild.id, interaction.user.id);
		const pet = account.pet;
		if (!pet?.petId) throw new UserFacingError("You do not have a pet to rehome.");

		const species = findPet(pet.petId);
		const refund = Math.floor((species?.price ?? 0) / 2);

		await setFields(guild.id, interaction.user.id, { pet: null });
		if (refund > 0) await adjustWallet(guild.id, interaction.user.id, refund);

		await reply(interaction, {
			embeds: [
				successEmbed(
					`${pet.emoji ?? ""} **${pet.name ?? "Your pet"}** has found a new home. You received **${formatNumber(refund)}**.`,
				),
			],
		});
	},
});
