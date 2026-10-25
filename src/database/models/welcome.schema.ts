import { model, Schema } from "mongoose";

/** How the greeting is drawn: plain text, an embed, or the rendered image card. */
export type WelcomeStyle = "text" | "embed" | "card";

/** The guild's background image, stored as bytes rather than a URL. */
export interface WelcomeBackground {
	data: Buffer;
	contentType: string;
	name: string;
}

export interface WelcomeSettings {
	guildId: string;
	channelId: string;
	message: string;
	/** Folded into `style` on read. */
	isEmbed: boolean;
	style?: WelcomeStyle;
	background?: WelcomeBackground | null;
	createdAt: Date;
	updatedAt: Date;
}

const welcomeBackgroundSchema = new Schema<WelcomeBackground>(
	{
		data: { type: Buffer, required: true },
		contentType: { type: String, required: true },
		name: { type: String, required: true },
	},
	{ _id: false },
);

const welcomeSchema = new Schema<WelcomeSettings>(
	{
		guildId: { type: String, required: true, unique: true },
		channelId: { type: String, required: true },
		message: { type: String, required: true },
		isEmbed: { type: Boolean, required: true, default: false },
		style: { type: String, enum: ["text", "embed", "card"], default: "card" },
		background: { type: welcomeBackgroundSchema, default: null },
	},
	{ timestamps: true },
);

export const Welcome = model<WelcomeSettings>("WelcomeMessage", welcomeSchema);
