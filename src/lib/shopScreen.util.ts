import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { button, row } from "@lib/components.util";
import {
	container,
	type ContainerMessage,
	containerMessage,
	type ContainerPart,
	divider,
	sectionWithButton,
	text,
} from "@lib/containers.util";
import { formatNumber } from "@lib/format.util";
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

/** How many entries get their own row with a buy button before it pages. */
export const SHOP_PAGE_SIZE = 5;

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
	/** Which page of the catalogue. */
	page?: number;
}

export function isShopSection(value: string): value is ShopSection {
	return (SHOP_SECTIONS as readonly string[]).includes(value);
}

export function isPetRarity(value: string): value is PetRarity {
	return (PET_RARITIES as readonly string[]).includes(value);
}

export function encodeShopState(action: string, state: ShopState, ownerId: string): string {
	return customId(
		SHOP_ID,
		action,
		state.section,
		state.rarity ?? NONE,
		state.selectedId ?? NONE,
		state.page ?? 0,
		ownerId,
	);
}

export function decodeShopState(args: string[]): ShopState {
	const [section = "items", rarity = NONE, selectedId = NONE, page = "0"] = args;
	const parsed = Number.parseInt(page, 10);

	return {
		section: isShopSection(section) ? section : "items",
		...(rarity !== NONE && isPetRarity(rarity) ? { rarity } : {}),
		...(selectedId !== NONE ? { selectedId } : {}),
		...(Number.isInteger(parsed) && parsed > 0 ? { page: parsed } : {}),
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
	/** Already yours, and sellable — the button becomes Sell rather than Buy. */
	owned?: boolean;
	/** What selling it back would pay. */
	refund?: number;
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
			return HOUSES.map((house) => {
				// The one you own turns into a Sell button rather than a dead
				// "already owned" row — selling used to be a separate subcommand
				// that took no confirmation.
				const isMine = balances.ownsHouse && balances.houseId === house.id;

				return {
					id: house.id,
					name: house.name,
					emoji: house.emoji,
					price: house.price,
					description: house.description,
					detail: `Passive income **${formatNumber(house.income)}/hour**`,
					...(isMine ? { owned: true, refund: Math.floor(house.price / 2) } : {}),
					...(balances.ownsHouse && !isMine ? { blocked: "You already own a house. Sell it first." } : {}),
				};
			});

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
				...(item.usable ? { detail: "Usable from `/inventory`" } : {}),
			}));
	}
}

export function findEntry(state: ShopState, balances: Balances, id: string): Entry | undefined {
	return entriesFor(state, balances).find((entry) => entry.id === id);
}

function priceLabel(entry: Entry): string {
	return entry.price > 0 ? formatNumber(entry.price) : "Free";
}

function catalogue(state: ShopState, balances: Balances, ownerId: string, note?: string): ContainerMessage {
	const entries = entriesFor(state, balances);
	const pages = Math.max(1, Math.ceil(entries.length / SHOP_PAGE_SIZE));
	const page = Math.min(Math.max(0, state.page ?? 0), pages - 1);
	const shown = entries.slice(page * SHOP_PAGE_SIZE, page * SHOP_PAGE_SIZE + SHOP_PAGE_SIZE);

	const parts: ContainerPart[] = [
		text(
			`## 🛒 Shop — ${SECTION_LABELS[state.section]}\n` +
				`Wallet **${formatNumber(balances.wallet)}** · ${entries.length} for sale`,
		),
		divider(),
	];

	if (note !== undefined) parts.push(text(`✅ ${note}`), divider());

	// One row per entry, with its buy button beside it rather than in a row
	// underneath — so nobody has to count buttons to match them to items.
	for (const entry of shown) {
		const owned = entry.owned === true;
		const note = owned
			? `You own this · sells for **${formatNumber(entry.refund ?? 0)}**`
			: (entry.blocked ?? entry.detail);

		parts.push(
			sectionWithButton(
				`**${entry.emoji} ${entry.name}** — ${priceLabel(entry)}\n` +
					`${entry.description}${note !== undefined ? `\n-# ${note}` : ""}`,
				owned
					? button({
							id: encodeShopState("sell", { ...state, selectedId: entry.id, page }, ownerId),
							label: "Sell",
							style: ButtonStyle.Danger,
						})
					: button({
							id: encodeShopState("buy", { ...state, selectedId: entry.id, page }, ownerId),
							label: entry.blocked !== undefined ? "Unavailable" : entry.price > 0 ? "Buy" : "Take",
							style: ButtonStyle.Success,
							disabled: entry.blocked !== undefined || balances.wallet < entry.price,
						}),
			),
		);
	}

	if (shown.length === 0) parts.push(text("_Nothing for sale here yet._"));

	parts.push(divider());

	if (pages > 1) {
		parts.push(
			text(`-# Page ${page + 1} of ${pages}`),
			row(
				button({
					id: encodeShopState("nav", { ...state, page: page - 1 }, ownerId),
					label: "Previous",
					disabled: page <= 0,
				}),
				button({
					id: encodeShopState("nav", { ...state, page: page + 1 }, ownerId),
					label: "Next",
					disabled: page >= pages - 1,
				}),
			),
		);
	}

	parts.push(sectionTabs(state, ownerId));

	if (state.section === "pets") {
		parts.push(
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

	return containerMessage(container({ category: "economy", parts }));
}

function detail(state: ShopState, balances: Balances, entry: Entry, ownerId: string): ContainerMessage {
	const affordable = balances.wallet >= entry.price;
	const reason = entry.blocked ?? (affordable ? undefined : "You cannot afford this yet.");

	return containerMessage(
		container({
			category: "economy",
			parts: [
				text(
					`## ${entry.emoji} ${entry.name}\n${entry.description}\n\n` +
						`**Price** ${priceLabel(entry)}  ·  **Wallet** ${formatNumber(balances.wallet)}` +
						(entry.detail !== undefined ? `\n${entry.detail}` : "") +
						(reason !== undefined ? `\n\n⚠️ ${reason}` : ""),
				),
				divider(),
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
		}),
	);
}

/**
 * Selling asks first, because it pays back half and cannot be undone.
 *
 * The confirm row lives inside the container: a Components V2 message cannot carry
 * a loose action row alongside one, so it has to be part of the same block.
 */
export function sellConfirmScreen(entry: Entry, balances: Balances, ownerId: string): ContainerMessage {
	const refund = entry.refund ?? 0;

	return containerMessage(
		container({
			category: "economy",
			parts: [
				text(
					`## ${entry.emoji} Sell ${entry.name}?\n` +
						`You paid **${formatNumber(entry.price)}** and get **${formatNumber(refund)}** back — half.\n` +
						`-# Wallet after selling: **${formatNumber(balances.wallet + refund)}**`,
				),
				divider(),
				row(
					button({
						id: customId(SHOP_ID, "sell-yes", ownerId),
						label: `Sell for ${formatNumber(refund)}`,
						style: ButtonStyle.Danger,
					}),
					button({ id: customId(SHOP_ID, "sell-no", ownerId), label: "Keep it", style: ButtonStyle.Secondary }),
				),
			],
		}),
	);
}

export function shopScreen(state: ShopState, balances: Balances, ownerId: string, note?: string): ContainerMessage {
	if (state.selectedId !== undefined && note === undefined) {
		const entry = findEntry(state, balances, state.selectedId);
		if (entry) return detail(state, balances, entry, ownerId);
	}

	return catalogue(state, balances, ownerId, note);
}
