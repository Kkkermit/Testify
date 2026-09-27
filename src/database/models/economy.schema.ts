import { model, Schema } from "mongoose";

export interface InventoryItem {
	itemId: string;
	name: string;
	emoji: string;
	quantity: number;
	purchasedAt: Date;
}

export interface House {
	houseId: string;
	name: string;
	emoji: string;
	value: number;
	purchasedAt: Date;
}

export interface Business {
	businessId: string;
	name: string;
	emoji: string;
	level: number;
	income: number;
	purchasedAt: Date;
	lastCollected: Date | null;
}

export interface Pet {
	petId: string | null;
	name: string | null;
	type: string | null;
	emoji: string | null;
	happiness: number;
	hunger: number;
	purchasedAt: Date | null;
	lastFed: Date | null;
	lastWalked: Date | null;
}

export interface EconomyAccount {
	guildId: string;
	userId: string;
	wallet: number;
	bank: number;
	worked: number;
	gambled: number;
	begged: number;
	dailyStreak: number;
	lastDaily: Date | null;
	hoursWorked: number;
	lastWorked: Date | null;
	commandsRan: number;
	moderated: number;
	inventory: InventoryItem[];
	job: string;
	jobLevel: number;
	house: House | null;
	businesses: Business[];
	robberySuccess: number;
	robberyFailed: number;
	lastRobbed: Date | null;
	lastRobbedBy: string | null;
	heistSuccess: number;
	heistFailed: number;
	lastHeist: Date | null;
	lastBegged: Date | null;
	pet: Pet | null;
	createdAt: Date;
	updatedAt: Date;
}

const inventoryItemSchema = new Schema<InventoryItem>(
	{
		itemId: { type: String, required: true },
		name: { type: String, required: true },
		emoji: { type: String, required: true, default: "📦" },
		quantity: { type: Number, required: true, default: 1 },
		purchasedAt: { type: Date, required: true, default: Date.now },
	},
	{ _id: false },
);

const houseSchema = new Schema<House>(
	{
		houseId: { type: String, required: true },
		name: { type: String, required: true },
		emoji: { type: String, required: true, default: "🏠" },
		value: { type: Number, required: true, default: 0 },
		purchasedAt: { type: Date, required: true, default: Date.now },
	},
	{ _id: false },
);

const businessSchema = new Schema<Business>(
	{
		businessId: { type: String, required: true },
		name: { type: String, required: true },
		emoji: { type: String, required: true, default: "🏢" },
		level: { type: Number, required: true, default: 1 },
		income: { type: Number, required: true, default: 0 },
		purchasedAt: { type: Date, required: true, default: Date.now },
		lastCollected: { type: Date, default: null },
	},
	{ _id: false },
);

const petSchema = new Schema<Pet>(
	{
		petId: { type: String, default: null },
		name: { type: String, default: null },
		type: { type: String, default: null },
		emoji: { type: String, default: null },
		happiness: { type: Number, required: true, default: 100 },
		hunger: { type: Number, required: true, default: 100 },
		purchasedAt: { type: Date, default: null },
		lastFed: { type: Date, default: null },
		lastWalked: { type: Date, default: null },
	},
	{ _id: false },
);

const economySchema = new Schema<EconomyAccount>(
	{
		guildId: { type: String, required: true },
		userId: { type: String, required: true },
		wallet: { type: Number, required: true, default: 0 },
		bank: { type: Number, required: true, default: 0 },
		worked: { type: Number, required: true, default: 0 },
		gambled: { type: Number, required: true, default: 0 },
		begged: { type: Number, required: true, default: 0 },
		dailyStreak: { type: Number, required: true, default: 0 },
		lastDaily: { type: Date, default: null },
		hoursWorked: { type: Number, required: true, default: 0 },
		lastWorked: { type: Date, default: null },
		commandsRan: { type: Number, required: true, default: 0 },
		moderated: { type: Number, required: true, default: 0 },
		inventory: { type: [inventoryItemSchema], required: true, default: [] },
		job: { type: String, required: true, default: "Unemployed" },
		jobLevel: { type: Number, required: true, default: 0 },
		house: { type: houseSchema, default: null },
		businesses: { type: [businessSchema], required: true, default: [] },
		robberySuccess: { type: Number, required: true, default: 0 },
		robberyFailed: { type: Number, required: true, default: 0 },
		lastRobbed: { type: Date, default: null },
		lastRobbedBy: { type: String, default: null },
		heistSuccess: { type: Number, required: true, default: 0 },
		heistFailed: { type: Number, required: true, default: 0 },
		lastHeist: { type: Date, default: null },
		lastBegged: { type: Date, default: null },
		pet: { type: petSchema, default: null },
	},
	{ timestamps: true },
);

economySchema.index({ guildId: 1, userId: 1 }, { unique: true });
economySchema.index({ guildId: 1, wallet: -1 });
economySchema.index({ guildId: 1, bank: -1 });

export const Economy = model<EconomyAccount>("Economy", economySchema);
