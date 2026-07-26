import { model, Schema } from "mongoose";

export interface UserProfile {
	userId: string;
	favouriteSong: string;
	about: string;
	birthday: Date | null;
	hobbies: string | null;
	favouriteGame: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const profileSchema = new Schema<UserProfile>(
	{
		userId: { type: String, required: true, unique: true },
		favouriteSong: { type: String, required: true },
		about: { type: String, required: true },
		birthday: { type: Date, default: null },
		hobbies: { type: String, default: null },
		favouriteGame: { type: String, default: null },
	},
	{ timestamps: true },
);

export const Profile = model<UserProfile>("Profile", profileSchema);
