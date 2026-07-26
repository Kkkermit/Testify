import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { adjustWallet, requireAccount, setFields } from "../../../database/repositories/economyRepository";
import { successEmbed } from "../../../ui/embeds";
import { formatNumber } from "../../../ui/format";
import { findPet } from "../data/pets";

export default defineCommand({
	name: "rehome",
	description: "Rehomes your pet for half of what you paid.",
	category: Category.Economy,
	surfaces: ["slash", "prefix"],
	guildOnly: true,

	async execute(ctx) {
		const guild = requireGuild(ctx);
		const account = await requireAccount(guild.id, ctx.user.id);
		const pet = account.pet;
		if (!pet?.petId) throw new UserFacingError("You do not have a pet to rehome.");

		const species = findPet(pet.petId);
		const refund = Math.floor((species?.price ?? 0) / 2);

		await setFields(guild.id, ctx.user.id, { pet: null });
		if (refund > 0) await adjustWallet(guild.id, ctx.user.id, refund);

		await ctx.reply({
			embeds: [
				successEmbed(
					`${pet.emoji ?? ""} **${pet.name ?? "Your pet"}** has found a new home. You received **${formatNumber(refund)}**.`,
				),
			],
		});
	},
});
