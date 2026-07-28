import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { type EconomyAccount } from "@database/models/economy.schema";
import { addInventoryItem, debitWallet, requireAccount, setFields } from "@database/repositories/economyRepository";
import { formatNumber } from "@lib/format.util";
import { findPet } from "@lib/pets.util";
import { findBusiness, findHouse, findJob, findShopItem } from "@lib/shop.util";
import { type Balances, decodeShopState, findEntry, SHOP_ID, shopScreen, type ShopState } from "@lib/shopScreen.util";

/** What the screen needs to know about the buyer, derived from their account. */
export function balancesOf(account: EconomyAccount): Balances {
	return {
		wallet: account.wallet,
		ownsHouse: account.house !== null,
		ownedBusinessIds: account.businesses.map((business) => business.businessId),
		ownedItemIds: account.inventory.filter((entry) => entry.quantity > 0).map((entry) => entry.itemId),
		job: account.job,
		hasPet: account.pet !== null,
	};
}

/**
 * Applies a purchase. Each branch debits first and only writes on success, so a
 * failed payment can never hand out the goods.
 */
async function purchase(state: ShopState, guildId: string, userId: string, account: EconomyAccount): Promise<string> {
	const id = state.selectedId ?? "";

	switch (state.section) {
		case "houses": {
			const house = findHouse(id);
			if (!house) throw new UserFacingError("That house is no longer for sale.");
			if (account.house !== null) throw new UserFacingError("You already own a house. Sell it first.");

			if (!(await debitWallet(guildId, userId, house.price))) {
				throw new UserFacingError("You cannot afford that any more.");
			}

			await setFields(guildId, userId, {
				house: {
					houseId: house.id,
					name: house.name,
					emoji: house.emoji,
					value: house.price,
					purchasedAt: new Date(),
				},
			});

			return `You bought ${house.emoji} **${house.name}**.`;
		}

		case "businesses": {
			const business = findBusiness(id);
			if (!business) throw new UserFacingError("That business is no longer for sale.");
			if (account.businesses.some((owned) => owned.businessId === business.id)) {
				throw new UserFacingError("You already own that business.");
			}

			if (!(await debitWallet(guildId, userId, business.price))) {
				throw new UserFacingError("You cannot afford that any more.");
			}

			await setFields(guildId, userId, {
				businesses: [
					...account.businesses,
					{
						businessId: business.id,
						name: business.name,
						emoji: business.emoji,
						level: 1,
						income: business.income,
						purchasedAt: new Date(),
						lastCollected: null,
					},
				],
			});

			return `You bought ${business.emoji} **${business.name}**.`;
		}

		case "jobs": {
			const job = findJob(id);
			if (!job) throw new UserFacingError("That job is no longer going.");

			const owned = account.inventory.filter((entry) => entry.quantity > 0).map((entry) => entry.itemId);
			const missing = job.requirements.filter((required) => !owned.includes(required));
			if (missing.length > 0) throw new UserFacingError(`You still need: ${missing.join(", ")}.`);

			await setFields(guildId, userId, { job: job.name, jobLevel: 1 });
			return `You are now a ${job.emoji} **${job.name}**.`;
		}

		case "pets": {
			const pet = findPet(id);
			if (!pet) throw new UserFacingError("That pet is no longer available.");
			if (account.pet !== null) throw new UserFacingError("You already have a pet. Rehome it first.");

			if (!(await debitWallet(guildId, userId, pet.price))) {
				throw new UserFacingError("You cannot afford that any more.");
			}

			await setFields(guildId, userId, {
				pet: {
					petId: pet.id,
					name: pet.name,
					type: pet.name,
					emoji: pet.emoji,
					happiness: 100,
					hunger: 100,
					purchasedAt: new Date(),
					lastFed: null,
					lastWalked: null,
				},
			});

			return `You adopted ${pet.emoji} **${pet.name}**. Look after it with \`/pet view\`.`;
		}

		case "items": {
			const item = findShopItem(id);
			if (!item) throw new UserFacingError("That item is no longer for sale.");

			if (!(await debitWallet(guildId, userId, item.price))) {
				throw new UserFacingError("You cannot afford that any more.");
			}

			await addInventoryItem(guildId, userId, {
				itemId: item.id,
				name: item.name,
				emoji: item.emoji,
				quantity: 1,
			});

			return `Bought ${item.emoji} **${item.name}** for **${formatNumber(item.price)}**.`;
		}
	}
}

export default defineButton({
	id: SHOP_ID,
	ownerOnly: true,

	async run(interaction, context) {
		if (interaction.guild === null) return;

		const guildId = interaction.guild.id;
		const userId = interaction.user.id;
		const state = decodeShopState(context.args);

		if (context.action === "pick" && interaction.isStringSelectMenu()) {
			const [picked] = interaction.values;
			await interaction.update(
				shopScreen(
					{ ...state, ...(picked !== undefined ? { selectedId: picked } : {}) },
					balancesOf(await requireAccount(guildId, userId)),
					userId,
				),
			);
			return;
		}

		if (!interaction.isButton()) return;

		if (context.action === "nav") {
			// A tab press clears the selection, so it lands on the catalogue.
			const { selectedId: _cleared, ...withoutSelection } = state;
			await interaction.update(shopScreen(withoutSelection, balancesOf(await requireAccount(guildId, userId)), userId));
			return;
		}

		if (context.action !== "buy") return;

		const account = await requireAccount(guildId, userId);

		// Re-checked here rather than trusting the button: the screen may have been
		// rendered before the money was spent somewhere else.
		const entry = findEntry(state, balancesOf(account), state.selectedId ?? "");
		if (entry?.blocked !== undefined) throw new UserFacingError(entry.blocked);

		const message = await purchase(state, guildId, userId, account);
		const updated = await requireAccount(guildId, userId);

		// Straight back to the catalogue with the new balance, so buying chains into
		// the next purchase. The confirmation rides along at the top rather than as a
		// separate message — a Components V2 payload cannot carry an embed.
		await interaction.update(shopScreen({ section: state.section }, balancesOf(updated), userId, message));
	},
});
