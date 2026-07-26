import { model, Schema } from "mongoose";

export type LotteryFrequency = "hourly" | "daily" | "weekly";

export interface LotteryEntry {
	userId: string;
	userTag: string;
	tickets: number;
	enteredAt: Date;
}

export interface LotteryWinner {
	userId: string;
	userTag: string;
	prizeAmount: number;
}

export interface LotteryDraw {
	drawTime: Date;
	totalPrizePool: number;
	totalTickets: number;
	winners: LotteryWinner[];
}

export interface LotteryRecord {
	guildId: string;
	isActive: boolean;
	isFrozen: boolean;
	entryFee: number;
	prizePool: number;
	basePrizePool: number;
	maxWinners: number;
	frequency: LotteryFrequency;
	nextDrawTime: Date;
	announcementChannelId: string;
	createdBy: string;
	lastModifiedBy: string;
	entries: LotteryEntry[];
	history: LotteryDraw[];
	createdAt: Date;
	updatedAt: Date;
}

const entrySchema = new Schema<LotteryEntry>(
	{
		userId: { type: String, required: true },
		userTag: { type: String, required: true },
		tickets: { type: Number, required: true, default: 1 },
		enteredAt: { type: Date, required: true, default: Date.now },
	},
	{ _id: false },
);

const winnerSchema = new Schema<LotteryWinner>(
	{
		userId: { type: String, required: true },
		userTag: { type: String, required: true },
		prizeAmount: { type: Number, required: true },
	},
	{ _id: false },
);

const drawSchema = new Schema<LotteryDraw>(
	{
		drawTime: { type: Date, required: true },
		totalPrizePool: { type: Number, required: true },
		totalTickets: { type: Number, required: true },
		winners: { type: [winnerSchema], required: true, default: [] },
	},
	{ _id: false },
);

const lotterySchema = new Schema<LotteryRecord>(
	{
		guildId: { type: String, required: true, unique: true },
		isActive: { type: Boolean, required: true, default: true },
		isFrozen: { type: Boolean, required: true, default: false },
		entryFee: { type: Number, required: true },
		prizePool: { type: Number, required: true, default: 0 },
		basePrizePool: { type: Number, required: true, default: 0 },
		maxWinners: { type: Number, required: true, default: 1 },
		frequency: { type: String, required: true, enum: ["hourly", "daily", "weekly"], default: "weekly" },
		nextDrawTime: { type: Date, required: true },
		announcementChannelId: { type: String, required: true },
		createdBy: { type: String, required: true },
		lastModifiedBy: { type: String, required: true },
		entries: { type: [entrySchema], required: true, default: [] },
		history: { type: [drawSchema], required: true, default: [] },
	},
	{ timestamps: true },
);

lotterySchema.index({ isActive: 1, isFrozen: 1, nextDrawTime: 1 });

export const Lottery = model<LotteryRecord>("Lottery", lotterySchema);
