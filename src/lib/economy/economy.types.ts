import { type BOARD_KINDS, type SHOP_SECTIONS, type PET_RARITIES } from "@lib/economy/economy.constants";

/** The types more than one module in this domain shares. */

export interface HeistState {
	guildId: string;
	leaderId: string;
	stake: number;
	participants: Set<string>;
	startedAt: number;
	messageId: string | null;
}

export type BoardKind = (typeof BOARD_KINDS)[number];

export type PetRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export interface PetSpecies {
	id: string;
	name: string;
	description: string;
	price: number;
	emoji: string;
	feedCost: number;
	incomeBonus: number;
	happinessBoost: number;
	rarity: PetRarity;
}

export type ShopSection = (typeof SHOP_SECTIONS)[number];

/** The shop's filter key: `pets.util`'s `PetRarity`, lowercased, as it travels in a custom ID. */
export type PetRarityKey = (typeof PET_RARITIES)[number];

export interface ShopState {
	section: ShopSection;
	/** One level deeper, pets only. */
	rarity?: PetRarityKey;
	/** Set on the detail view. */
	selectedId?: string;
	/** Which page of the catalogue. */
	page?: number;
	/** Opened from the balance panel, which the catalogue then offers a way back to. */
	from?: "balance";
}

export interface Balances {
	wallet: number;
	ownsHouse: boolean;
	/** Which house, so it can offer to sell that one specifically. */
	houseId?: string;
	ownedBusinessIds: string[];
	ownedItemIds: string[];
	job: string;
	hasPet: boolean;
}

/** Moving money into the bank, or out of it. */
export type MoneyAction = "dep" | "wit";

/** A chooser opened from the balance panel goes back to it; one opened by `/deposit` has nowhere to go back to. */
export type MoneyOrigin = "command" | "balance";
