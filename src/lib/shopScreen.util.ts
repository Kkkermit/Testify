import { ButtonStyle, StringSelectMenuOptionBuilder } from "discord.js";
import { customId } from "@core/button";
import { button, type RenderedScreen, row, select, selectRow } from "@lib/components.util";
import { embed } from "@lib/embeds.util";
import { formatNumber, truncate } from "@lib/format.util";
import { ALL_PETS, type PetSpecies, PETS_BY_RARITY } from "@lib/pets.util";
import { BUSINESSES, HOUSES, JOBS, SHOP_ITEMS } from "@lib/shop.util";

/**
 * The shop, as a drill-down rather than a list of IDs to copy.
 *
 * `/shop view` used to print every item with its raw ID in backticks so people
 * could paste it into `/shop buy <id>`. The bot already knows the catalogue, so
 * the user should be picking from it.
 *
 * Pure: state in, rendered screen out. Both the command and the button handler
 * call the same function, so the first render and every re-render cannot drift.
 */

export const SHOP_ID = "shop";

export const SHOP_SECTIONS = ["items", "houses", "businesses", "jobs", "pets"] as const;
export type ShopSection = (typeof SHOP_SECTIONS)[number];

export const PET_RARITIES = ["common", "uncommon", "rare", "epic", "legendary"] as const;
export type PetRarity = (typeof PET_RARITIES)[number];

const SECTION_LABELS: Record<ShopSection, string> = {
	items: "Items",
	houses: "Houses",
	businesses: "Businesses",
	jobs: "Jobs",
	pets: "Pets",
};

/** `-` stands in for an absent part, because a custom ID cannot hold an empty one. */
const NONE = "-";

export interface ShopState {
	section: ShopSection;
	/** One level deeper, pets only. */
	rarity?: PetRarity;
	/** Set on the detail view. */
	selectedId?: string;
}

export function isShopSection(value: string): value is ShopSection {
	return (SHOP_SECTIONS as readonly string[]).includes(value);
}

export function isPetRarity(value: string): value is PetRarity {
	return (PET_RARITIES as readonly string[]).includes(value);
}

export function encodeShopState(action: string, state: ShopState, ownerId: string): string {
	return customId(SHOP_ID, action, state.section, state.rarity ?? NONE, state.selectedId ?? NONE, ownerId);
}

export function decodeShopState(args: string[]): ShopState {
	const [section = "items", rarity = NONE, selectedId = NONE] = args;

	return {
		section: isShopSection(section) ? section : "items",
		...(rarity !== NONE && isPetRarity(rarity) ? { rarity } : {}),
		...(selectedId !== NONE ? { selectedId } : {}),
	};
}

/** One row of tabs, with the section you are already on greyed out. */
function sectionTabs(state: ShopState, ownerId: string): ReturnType<typeof row> {
	return row(
		...SHOP_SECTIONS.map((section) =>
			button({
				id: encodeShopState("nav", { section }, ownerId),
				label: SECTION_LABELS[section],
				disabled: section === state.section,
			}),
		),
	);
}

export interface Entry {
	id: string;
	name: string;
	emoji: string;
	price: number;
	description: string;
	/** Extra detail shown on the detail screen. */
	detail?: string;
	/** Why this entry cannot be bought right now. */
	blocked?: string;
}

export interface Balances {
	wallet: number;
	ownsHouse: boolean;
	ownedBusinessIds: string[];
	ownedItemIds: string[];
	job: string;
	hasPet: boolean;
}

function petEntry(pet: PetSpecies, balances: Balances): Entry {
	return {
		id: pet.id,
		name: pet.name,
		emoji: pet.emoji,
		price: pet.price,
		description: pet.description,
		detail: `Feeding costs **${formatNumber(pet.feedCost)}** · Income bonus **+${pet.incomeBonus}**`,
		...(balances.hasPet ? { blocked: "You already have a pet. Rehome it first." } : {}),
	};
}

/** Everything on sale in one section, already annotated with what you cannot buy. */
export function entriesFor(state: ShopState, balances: Balances): Entry[] {
	switch (state.section) {
		case "houses":
			return HOUSES.map((house) => ({
				id: house.id,
				name: house.name,
				emoji: house.emoji,
				price: house.price,
				description: house.description,
				detail: `Passive income **${formatNumber(house.income)}/hour**`,
				...(balances.ownsHouse ? { blocked: "You already own a house. Sell it first." } : {}),
			}));

		case "businesses":
			return BUSINESSES.map((business) => ({
				id: business.id,
				name: business.name,
				emoji: business.emoji,
				price: business.price,
				description: business.description,
				detail: `Passive income **${formatNumber(business.income)}/hour**`,
				...(balances.ownedBusinessIds.includes(business.id) ? { blocked: "You already own this." } : {}),
			}));

		case "jobs": {
			return JOBS.map((job) => {
				const missing = job.requirements.filter((id) => !balances.ownedItemIds.includes(id));

				return {
					id: job.id,
					name: job.name,
					emoji: job.emoji,
					price: 0,
					description: job.description,
					detail: `Pays **${formatNumber(job.basePay)}** per shift`,
					...(balances.job === job.name
						? { blocked: "This is already your job." }
						: missing.length > 0
							? { blocked: `You need to own: ${missing.join(", ")}` }
							: {}),
				};
			});
		}

		case "pets":
			return (state.rarity === undefined ? ALL_PETS : PETS_BY_RARITY[state.rarity]).map((pet) =>
				petEntry(pet, balances),
			);

		case "items":
			return SHOP_ITEMS.map((item) => ({
				id: item.id,
				name: item.name,
				emoji: item.emoji,
				price: item.price,
				description: item.description,
				...(item.usable ? { detail: "Usable with `/use`" } : {}),
			}));
	}
}

export function findEntry(state: ShopState, balances: Balances, id: string): Entry | undefined {
	return entriesFor(state, balances).find((entry) => entry.id === id);
}

function priceLabel(entry: Entry): string {
	return entry.price > 0 ? formatNumber(entry.price) : "Free";
}

function catalogue(state: ShopState, balances: Balances, ownerId: string): RenderedScreen {
	const entries = entriesFor(state, balances);

	const rows = [sectionTabs(state, ownerId)];

	// Pets get a second tab strip, because five rarities of five is too many for
	// one 25-option menu to stay readable.
	if (state.section === "pets") {
		rows.push(
			row(
				...PET_RARITIES.map((rarity) =>
					button({
						id: encodeShopState("nav", { section: "pets", rarity }, ownerId),
						label: rarity[0]!.toUpperCase() + rarity.slice(1),
						disabled: rarity === state.rarity,
					}),
				),
			),
		);
	}

	if (entries.length > 0) {
		rows.push(
			selectRow(
				select({
					id: encodeShopState("pick", state, ownerId),
					placeholder: `Pick something to see it in full…`,
					options: entries.slice(0, 25).map((entry) =>
						new StringSelectMenuOptionBuilder()
							.setLabel(truncate(`${entry.name} — ${priceLabel(entry)}`, 100))
							.setValue(entry.id)
							.setDescription(truncate(entry.blocked ?? entry.description, 100))
							.setEmoji(entry.emoji),
					),
				}),
			),
		);
	}

	return {
		embeds: [
			embed({
				category: "economy",
				title: `🛒 Shop — ${SECTION_LABELS[state.section]}`,
				description:
					entries.length > 0 ? "Pick anything below to see the detail and buy it." : "Nothing for sale here yet.",
				fields: [
					{ name: "Your wallet", value: formatNumber(balances.wallet), inline: true },
					{ name: "For sale", value: String(entries.length), inline: true },
				],
			}),
		],
		components: rows,
	};
}

function detail(state: ShopState, balances: Balances, entry: Entry, ownerId: string): RenderedScreen {
	const affordable = balances.wallet >= entry.price;
	const reason = entry.blocked ?? (affordable ? undefined : "You cannot afford this yet.");

	return {
		embeds: [
			embed({
				category: "economy",
				title: `${entry.emoji} ${entry.name}`,
				description: entry.description,
				fields: [
					{ name: "Price", value: priceLabel(entry), inline: true },
					{ name: "Your wallet", value: formatNumber(balances.wallet), inline: true },
					...(entry.detail !== undefined ? [{ name: "Details", value: entry.detail, inline: false }] : []),
					...(reason !== undefined ? [{ name: "Not available", value: reason, inline: false }] : []),
				],
			}),
		],
		components: [
			row(
				button({
					id: encodeShopState("buy", { ...state, selectedId: entry.id }, ownerId),
					label: entry.price > 0 ? `Buy — ${formatNumber(entry.price)}` : "Take this job",
					style: ButtonStyle.Success,
					disabled: reason !== undefined,
				}),
				button({
					// Every screen needs a way back.
					id: encodeShopState(
						"nav",
						{ section: state.section, ...(state.rarity ? { rarity: state.rarity } : {}) },
						ownerId,
					),
					label: "Back",
					style: ButtonStyle.Secondary,
				}),
			),
		],
	};
}

export function shopScreen(state: ShopState, balances: Balances, ownerId: string): RenderedScreen {
	if (state.selectedId !== undefined) {
		const entry = findEntry(state, balances, state.selectedId);
		if (entry) return detail(state, balances, entry, ownerId);
	}

	return catalogue(state, balances, ownerId);
}
