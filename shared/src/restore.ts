import { type ZodType } from "zod";
import { birthdayPatch } from "./birthdays";
import { casePatch } from "./cases";
import { goodbyePatch } from "./goodbye";
import { ideaSettingsPatch } from "./ideas";
import { levellingPatchSchema } from "./levelling";
import { lotteryPatch } from "./lottery";
import { musicPatch } from "./music";
import { raidPatch } from "./raid";
import { antiLinkPatch, autoRolePut, countingPatch, prefixPatch, voiceStatsPatch } from "./settings";
import { starboardPatch } from "./starboard";
import { tempVoicePatch } from "./tempVoice";
import { treasurePatch } from "./treasure";
import { verificationPatchSchema } from "./verification";
import { welcomePatchSchema } from "./welcome";

export interface Restorable {
	/** Under `/guilds/:guildId`, so the route's own gates decide a put-back exactly as they decided the change. */
	path: string;
	method: "PATCH" | "PUT";
	/** Where the setting is read now, when it is not `path`. */
	read?: string;
	/** The key of the read answer that holds these fields, for a document holding several settings. */
	section?: string;
	/** What a put-back may send; a field that acts rather than stores, like `publish` or `reset`, is never one. */
	fields: readonly string[];
	schema: ZodType;
}

export const RESTORABLE = {
	"welcome.update": {
		path: "/welcome",
		method: "PATCH",
		fields: ["enabled", "channelId", "message", "style"],
		schema: welcomePatchSchema,
	},
	"goodbye.update": {
		path: "/goodbye",
		method: "PATCH",
		fields: ["enabled", "channelId", "message", "style"],
		schema: goodbyePatch,
	},
	"birthdays.update": {
		path: "/birthdays",
		method: "PATCH",
		fields: ["enabled", "channelId", "message"],
		schema: birthdayPatch,
	},
	"levelling.update": {
		path: "/levelling",
		method: "PATCH",
		fields: ["enabled", "announce", "stackRewards", "levelUpChannelId"],
		schema: levellingPatchSchema,
	},
	"starboard.update": {
		path: "/starboard",
		method: "PATCH",
		fields: ["enabled", "channelId", "threshold", "selfStar"],
		schema: starboardPatch,
	},
	"ideas.update": { path: "/ideas", method: "PATCH", fields: ["enabled", "channelId"], schema: ideaSettingsPatch },
	"temp-voice.update": {
		path: "/temp-voice",
		method: "PATCH",
		fields: ["enabled", "lobbyChannelId", "categoryId", "nameTemplate", "userLimit"],
		schema: tempVoicePatch,
	},
	"raid.update": {
		path: "/raid-protection",
		method: "PATCH",
		fields: ["enabled", "alertChannelId", "pingRoleId", "minAccountAgeDays", "spikeJoins", "spikeMinutes"],
		schema: raidPatch,
	},
	"cases.settings": { path: "/cases/settings", method: "PUT", fields: ["logChannelId"], schema: casePatch },
	"verification.update": {
		path: "/verification",
		method: "PATCH",
		fields: ["enabled", "channelId", "roleId", "message"],
		schema: verificationPatchSchema,
	},
	"music.update": { path: "/music", method: "PATCH", fields: ["enabled", "djRoleIds"], schema: musicPatch },
	"treasure.update": {
		path: "/treasure",
		method: "PATCH",
		fields: ["enabled", "minMessages", "maxMessages", "minAmount", "maxAmount", "cooldownMs"],
		schema: treasurePatch,
	},
	"lottery.update": {
		path: "/lottery",
		method: "PATCH",
		fields: ["entryFee", "basePrizePool", "maxWinners", "frequency", "announcementChannelId", "frozen"],
		schema: lotteryPatch,
	},
	"settings.prefix": {
		path: "/settings/prefix",
		method: "PATCH",
		read: "/settings",
		section: "prefix",
		fields: ["prefix", "enabled"],
		schema: prefixPatch,
	},
	"settings.anti-link": {
		path: "/settings/anti-link",
		method: "PATCH",
		read: "/settings",
		section: "antiLink",
		fields: ["enabled", "bypassPermission"],
		schema: antiLinkPatch,
	},
	"settings.auto-roles": {
		path: "/settings/auto-roles",
		method: "PUT",
		read: "/settings",
		section: "autoRoles",
		fields: ["roleIds"],
		schema: autoRolePut,
	},
	"settings.counting": {
		path: "/settings/counting",
		method: "PATCH",
		read: "/settings",
		section: "counting",
		fields: ["enabled", "channelId", "maxCount"],
		schema: countingPatch,
	},
	"settings.voice-stats": {
		path: "/settings/voice-stats",
		method: "PATCH",
		read: "/settings",
		section: "voiceStats",
		fields: ["memberChannelId", "botChannelId"],
		schema: voiceStatsPatch,
	},
} as const satisfies Record<string, Restorable>;

export type RestorableAction = keyof typeof RESTORABLE;

export function isRestorable(action: string): action is RestorableAction {
	return Object.hasOwn(RESTORABLE, action);
}

export interface ChangeRestore {
	action: RestorableAction;
	/** The old values of the fields this change altered. */
	put: Record<string, unknown>;
	/** What this change left in those fields; anything else there now means somebody changed it since. */
	expect: Record<string, unknown>;
}

type Plain = Record<string, unknown>;

function isPlain(value: unknown): value is Plain {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Equality over JSON values, ignoring key order, so a stored document and a read one compare as the same. */
export function sameValue(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true;
	if (Array.isArray(a) || Array.isArray(b)) {
		return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => sameValue(item, b[i]));
	}
	if (!isPlain(a) || !isPlain(b)) return false;

	const keys = Object.keys(a);
	return (
		keys.length === Object.keys(b).length && keys.every((key) => Object.hasOwn(b, key) && sameValue(a[key], b[key]))
	);
}

/** The named fields of a settings answer, as an audit record keeps them; an absent field is left out. */
export function restorableFields(action: RestorableAction, settings: unknown): Plain {
	const entry: Restorable = RESTORABLE[action];
	const source = isPlain(settings) && entry.section !== undefined ? settings[entry.section] : settings;
	if (!isPlain(source)) return {};

	return Object.fromEntries(entry.fields.filter((field) => source[field] !== undefined).map((f) => [f, source[f]]));
}

/** Null unless the record says exactly what changed and the old values are still a write the route accepts. */
export function restoreOf(action: string, before: unknown, after: unknown): ChangeRestore | null {
	if (!isRestorable(action) || !isPlain(before) || !isPlain(after)) return null;

	const entry: Restorable = RESTORABLE[action];
	const changed = entry.fields.filter(
		(field) => Object.hasOwn(before, field) && Object.hasOwn(after, field) && !sameValue(before[field], after[field]),
	);
	if (changed.length === 0) return null;

	const put = Object.fromEntries(changed.map((field) => [field, before[field]]));
	if (!entry.schema.safeParse(put).success) return null;

	return { action, put, expect: Object.fromEntries(changed.map((field) => [field, after[field]])) };
}

/** True while the setting still holds what the change left, so putting it back cannot undo a later change too. */
export function stillAsLeft(restore: ChangeRestore, now: unknown): boolean {
	const current = restorableFields(restore.action, now);
	return Object.entries(restore.expect).every(
		([field, value]) => Object.hasOwn(current, field) && sameValue(current[field], value),
	);
}
