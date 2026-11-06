import {
	type AccountChange,
	type AccountProfile,
	type AccountSession,
	type ManageableGuild,
	type ProfileBody,
} from "@testify/shared";
import { comparable } from "@/features/compare/compare.utils";
import { type TranslationKey } from "@/i18n";
import { ApiError } from "@/lib/api";
import { oneOf } from "@/lib/oneOf";

const ACCOUNT_TABS = ["profile", "history", "reminders", "sessions", "data"] as const;

export type AccountTab = (typeof ACCOUNT_TABS)[number];

export function accountTabFrom(raw: string | null): AccountTab {
	return oneOf(ACCOUNT_TABS, raw, "profile");
}

/** A change opens that server's Changes page only while the reader can still manage it there. */
export function changeLink(change: Pick<AccountChange, "guildId">, guilds: readonly ManageableGuild[]): string | null {
	if (change.guildId === null) return null;

	return comparable(guilds).some((guild) => guild.id === change.guildId) ? `/guilds/${change.guildId}/changes` : null;
}

/** The browser asking first, then the rest by when each was last used. */
export function sessionsInOrder(sessions: readonly AccountSession[]): AccountSession[] {
	return [...sessions].sort(
		(a, b) => Number(b.current) - Number(a.current) || Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt),
	);
}

export interface ProfileDraft {
	about: string;
	favouriteSong: string;
	favouriteGame: string;
	hobbies: string;
	birthday: string;
}

export function profileDraft(profile: AccountProfile | null): ProfileDraft {
	return {
		about: profile?.about ?? "",
		favouriteSong: profile?.favouriteSong ?? "",
		favouriteGame: profile?.favouriteGame ?? "",
		hobbies: profile?.hobbies ?? "",
		birthday: profile?.birthday ?? "",
	};
}

/** An empty optional field is sent as null, which is what `/profile set` stores when it is left out. */
export function profileBodyOf(draft: ProfileDraft): ProfileBody {
	const optional = (value: string): string | null => (value.trim() === "" ? null : value);

	return {
		about: draft.about,
		favouriteSong: draft.favouriteSong,
		favouriteGame: optional(draft.favouriteGame),
		hobbies: optional(draft.hobbies),
		birthday: optional(draft.birthday),
	};
}

export function sameProfile(a: ProfileDraft, b: ProfileDraft): boolean {
	return (Object.keys(a) as (keyof ProfileDraft)[]).every((key) => a[key] === b[key]);
}

export function profileReady(draft: ProfileDraft): boolean {
	return draft.about.trim() !== "" && draft.favouriteSong.trim() !== "";
}

const PROFILE_REFUSALS: Partial<Record<string, TranslationKey>> = {
	profanity: "account.profileProfanity",
	birthday: "account.profileBadBirthday",
	blacklisted: "account.blacklisted",
};

const REMINDER_REFUSALS: Partial<Record<string, TranslationKey>> = {
	tooSoon: "account.reminderTooSoon",
	tooLate: "account.reminderTooLate",
	reminder_not_found: "account.reminderGone",
	blacklisted: "account.blacklisted",
};

export function profileRefusal(error: Error): TranslationKey {
	return (error instanceof ApiError ? PROFILE_REFUSALS[error.code] : undefined) ?? "account.profileFailed";
}

export function reminderRefusal(error: Error): TranslationKey {
	return (error instanceof ApiError ? REMINDER_REFUSALS[error.code] : undefined) ?? "account.reminderEditFailed";
}
