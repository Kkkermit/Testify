import { type UserProfile } from "@database/models/profile.schema";
import { saveProfile } from "@database/repositories/profileRepository";
import { containsProfanity } from "@lib/moderation/contentFilter.util";
import { type AccountProfile, birthdayFrom, birthdayText, type ProfileBody } from "@testify/shared";

/** Why a profile was refused; each surface words it, `/profile set` in English and the dashboard by translation. */
export type ProfileProblem = "profanity" | "birthday";

export interface ProfileFields {
	about: string;
	favouriteSong: string;
	favouriteGame: string | null;
	hobbies: string | null;
	birthday: string | null;
}

export function profileProblem(fields: ProfileFields, now: Date = new Date()): ProfileProblem | null {
	const words = [fields.about, fields.favouriteSong, fields.favouriteGame, fields.hobbies];
	if (words.some((value) => value !== null && containsProfanity(value))) return "profanity";
	if (fields.birthday !== null && birthdayFrom(fields.birthday, now) === null) return "birthday";
	return null;
}

/** Saves somebody's own profile once `profileProblem` has passed; the one write both surfaces make. */
export async function saveOwnProfile(userId: string, fields: ProfileBody): Promise<UserProfile> {
	return saveProfile(userId, {
		about: fields.about,
		favouriteSong: fields.favouriteSong,
		favouriteGame: fields.favouriteGame,
		hobbies: fields.hobbies,
		birthday: fields.birthday === null ? null : birthdayFrom(fields.birthday),
	});
}

export function toAccountProfile(profile: UserProfile): AccountProfile {
	return {
		about: profile.about,
		favouriteSong: profile.favouriteSong,
		favouriteGame: profile.favouriteGame ?? null,
		hobbies: profile.hobbies ?? null,
		birthday: birthdayText(profile.birthday ?? null),
		updatedAt: profile.updatedAt.toISOString(),
	};
}
