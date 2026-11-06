import { z } from "zod";
import { RESTORABLE, type Restorable, type RestorableAction, restorableFields, sameValue } from "./restore";
import { plainLine } from "./text";

/** A server’s settings as a file to keep, or to copy to another server, over the same writes Put back uses. */

export const BACKUP_LIMITS = {
	maxBytes: 256 * 1024,
	maxNames: 1_000,
	maxName: 100,
	maxText: 4_000,
	maxList: 100,
} as const;

export const BACKUP_SECTIONS = Object.keys(RESTORABLE) as RestorableAction[];

type Plain = Record<string, unknown>;

const snowflake = z.string().regex(/^\d{17,20}$/);
const name = plainLine(0, BACKUP_LIMITS.maxName);
const names = z
	.record(snowflake, name)
	.refine((value) => Object.keys(value).length <= BACKUP_LIMITS.maxNames, "Too many names.");

/** A setting is text, a number, a switch or a short list of those; nothing in a backup nests any deeper. */
const settingScalar = z.union([z.string().max(BACKUP_LIMITS.maxText), z.number(), z.boolean(), z.null()]);
const settingValue = z.union([settingScalar, z.array(settingScalar).max(BACKUP_LIMITS.maxList)]);

/** Only the sections Put back covers, and in each only the fields its route takes. */
const sections = z.record(z.string(), z.record(z.string(), settingValue)).superRefine((value, context) => {
	for (const [action, section] of Object.entries(value)) {
		if (!Object.hasOwn(RESTORABLE, action)) {
			context.addIssue({ code: "custom", message: "Not a section a backup holds.", path: [action] });
			continue;
		}
		const fields: readonly string[] = RESTORABLE[action as RestorableAction].fields;
		for (const field of Object.keys(section)) {
			if (!fields.includes(field)) {
				context.addIssue({ code: "custom", message: "Not a field this section holds.", path: [action, field] });
			}
		}
	}
});

export const backupDocument = z.strictObject({
	kind: z.literal("testify-backup"),
	version: z.literal(1),
	guildName: name,
	exportedAt: z.iso.datetime(),
	sections,
	/** Names of the channels and roles the sections point at, so a copy to another server can find its own. */
	channels: names,
	roles: names,
});

export type BackupDocument = z.infer<typeof backupDocument>;

/** Why a file was refused, before anything in it was read as settings. */
export type BackupRefusal = "tooLarge" | "notJson" | "program" | "notBackup";

export interface BackupFile {
	name: string;
	type: string;
	bytes: Uint8Array;
}

/** The first bytes of programs, scripts, archives and documents; no backup starts with any of them. */
const NOT_A_BACKUP: readonly (readonly number[])[] = [
	[0x4d, 0x5a], // MZ: a Windows .exe or .dll
	[0x7f, 0x45, 0x4c, 0x46], // ELF: a Linux program
	[0xcf, 0xfa, 0xed, 0xfe], // Mach-O: a macOS program, 64-bit
	[0xce, 0xfa, 0xed, 0xfe], // Mach-O, 32-bit
	[0xca, 0xfe, 0xba, 0xbe], // a macOS universal program, or a Java class
	[0x23, 0x21], // #!: a shell, Bash, Python or other script
	[0x50, 0x4b, 0x03, 0x04], // PK: a zip, .jar, .apk or Office file
	[0x1f, 0x8b], // gzip
	[0x52, 0x61, 0x72, 0x21], // Rar!
	[0x37, 0x7a, 0xbc, 0xaf], // 7z
	[0xd0, 0xcf, 0x11, 0xe0], // an .msi or old Office file
	[0x25, 0x50, 0x44, 0x46], // %PDF
];

/** JSON.parse keeps these as ordinary keys, but no backup has a reason to carry one. */
const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function refusePrototypeKeys(key: string, value: unknown): unknown {
	if (PROTOTYPE_KEYS.has(key)) throw new SyntaxError("A backup carries no prototype keys.");
	return value;
}

/** A backup file's settings, or why it is refused; each check runs before the next part of the file is read. */
export function readBackupFile(file: BackupFile): BackupDocument | BackupRefusal {
	const { bytes } = file;
	if (bytes.length > BACKUP_LIMITS.maxBytes) return "tooLarge";
	if (!/^[^\\/]+\.json$/i.test(file.name) || (file.type !== "" && file.type !== "application/json")) return "notJson";
	if (NOT_A_BACKUP.some((signature) => signature.every((byte, index) => bytes[index] === byte))) return "program";

	let text: string;
	try {
		text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		return "program";
	}

	let value: unknown;
	try {
		value = JSON.parse(text, refusePrototypeKeys);
	} catch {
		// A syntax error, a prototype key, or a stack overflow from nesting no backup has.
		return "notBackup";
	}
	const parsed = backupDocument.safeParse(value);
	return parsed.success ? parsed.data : "notBackup";
}

/** Which fields name a channel or a role, by the same rule the server's reach check reads them by. */
export function placeKind(field: string): "channel" | "role" | null {
	if (/channel|category/i.test(field)) return "channel";
	if (/role/i.test(field)) return "role";
	return null;
}

function isPlain(value: unknown): value is Plain {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface Places {
	channels: readonly { id: string; name: string | null }[];
	roles: readonly { id: string; name: string }[];
}

/** Every setting the reader could read, by section, with the names of what they point at. */
export function buildBackup(
	guildName: string,
	reads: Partial<Record<RestorableAction, unknown>>,
	places: Places,
	now = new Date(),
): BackupDocument {
	const sections: Record<string, Plain> = {};
	const named = { channel: new Set<string>(), role: new Set<string>() };

	for (const action of BACKUP_SECTIONS) {
		if (!(action in reads)) continue;
		const fields = restorableFields(action, reads[action]);
		if (Object.keys(fields).length === 0) continue;
		sections[action] = fields;

		for (const [field, value] of Object.entries(fields)) {
			const kind = placeKind(field);
			if (kind === null) continue;
			for (const id of Array.isArray(value) ? value : [value]) if (typeof id === "string") named[kind].add(id);
		}
	}

	const nameOf = (list: readonly { id: string; name: string | null }[], ids: Set<string>): Record<string, string> =>
		Object.fromEntries(
			list.flatMap((entry) => (ids.has(entry.id) && entry.name !== null ? [[entry.id, entry.name]] : [])),
		);

	return {
		kind: "testify-backup",
		version: 1,
		guildName,
		exportedAt: now.toISOString(),
		// Restorable fields are the routes' own settings, which are all scalars or lists of them.
		sections: sections as BackupDocument["sections"],
		channels: nameOf(places.channels, named.channel),
		roles: nameOf(places.roles, named.role),
	};
}

export interface BackupStep {
	action: RestorableAction;
	path: string;
	method: "PATCH" | "PUT";
	body: Plain;
	/** What the source pointed at that this server has nothing called, so that part is left as it is here. */
	missing: { kind: "channel" | "role"; name: string | null }[];
	/** This server already holds every value the step would send. */
	unchanged: boolean;
}

export interface BackupPlan {
	steps: BackupStep[];
	/** Sections whose values this server's routes would refuse as malformed, such as a file edited by hand. */
	unusable: RestorableAction[];
	/** Sections with nothing left to send once what has no match here is taken out, and what had no match. */
	left: { action: RestorableAction; missing: BackupStep["missing"] }[];
}

/** Each write a setup asks of this server, with ids moved to what is called the same here. */
export function planBackup(
	document: BackupDocument,
	here: Places,
	current: Partial<Record<RestorableAction, unknown>>,
): BackupPlan {
	const visible = {
		channel: here.channels.filter((entry): entry is { id: string; name: string } => entry.name !== null),
		role: here.roles,
	};
	const steps: BackupStep[] = [];
	const unusable: RestorableAction[] = [];
	const left: BackupPlan["left"] = [];

	for (const action of BACKUP_SECTIONS) {
		const section = document.sections[action];
		if (!isPlain(section)) continue;
		const entry: Restorable = RESTORABLE[action];
		const missing: BackupStep["missing"] = [];

		const mapped = (kind: "channel" | "role", id: unknown): string | null | undefined => {
			if (id === null) return null;
			if (typeof id !== "string") return undefined;
			if (visible[kind].some((place) => place.id === id)) return id;
			const name = (kind === "channel" ? document.channels : document.roles)[id] ?? null;
			const match =
				name === null ? undefined : visible[kind].find((place) => place.name.toLowerCase() === name.toLowerCase());
			if (match !== undefined) return match.id;
			missing.push({ kind, name });
			return undefined;
		};

		const body: Plain = {};
		for (const field of entry.fields) {
			if (!Object.hasOwn(section, field)) continue;
			const value = section[field];
			const kind = placeKind(field);
			if (kind === null) body[field] = value;
			else if (Array.isArray(value)) {
				const ids = value.map((id) => mapped(kind, id)).filter((id) => typeof id === "string");
				// A list with nothing found here would empty this server's own, which is not what a copy means.
				if (ids.length > 0 || value.length === 0) body[field] = ids;
			} else {
				const id = mapped(kind, value);
				if (id !== undefined) body[field] = id;
			}
		}

		if (Object.keys(body).length === 0) {
			if (missing.length > 0) left.push({ action, missing });
			continue;
		}
		const checked = entry.schema.safeParse(body);
		if (!checked.success || !isPlain(checked.data)) {
			unusable.push(action);
			continue;
		}
		// What is sent is what the route's schema made of it, with its text cleaned, never the file's own values.
		const clean: Plain = checked.data;
		for (const field of Object.keys(body)) body[field] = clean[field];

		const now = restorableFields(action, current[action]);
		const unchanged = Object.entries(body).every(([field, value]) => sameValue(now[field], value));
		steps.push({ action, path: entry.path, method: entry.method, body, missing, unchanged });
	}

	return { steps, unusable, left };
}
