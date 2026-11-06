import { z } from "zod";
import { RESTORABLE, type Restorable, type RestorableAction, restorableFields, sameValue } from "./restore";

/** A server’s settings as a file to keep, or to copy to another server, over the same writes Put back uses. */

export const BACKUP_LIMITS = { maxBytes: 256 * 1024, maxNames: 1_000, maxName: 100 } as const;

export const BACKUP_SECTIONS = Object.keys(RESTORABLE) as RestorableAction[];

type Plain = Record<string, unknown>;

const snowflake = z.string().regex(/^\d{17,20}$/);
const names = z
	.record(snowflake, z.string().max(BACKUP_LIMITS.maxName))
	.refine((value) => Object.keys(value).length <= BACKUP_LIMITS.maxNames, "Too many names.");

/** Section and field names are plain words, so no key in a file can reach an object's prototype. */
export const backupDocument = z.object({
	kind: z.literal("testify-backup"),
	version: z.literal(1),
	guildName: z.string().max(BACKUP_LIMITS.maxName),
	exportedAt: z.iso.datetime(),
	sections: z.record(z.string().regex(/^[a-z-]+\.[a-z-]+$/), z.record(z.string().regex(/^[A-Za-z]+$/), z.unknown())),
	/** Names of the channels and roles the sections point at, so a copy to another server can find its own. */
	channels: names,
	roles: names,
});

export type BackupDocument = z.infer<typeof backupDocument>;

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
		sections,
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
		if (!entry.schema.safeParse(body).success) {
			unusable.push(action);
			continue;
		}

		const now = restorableFields(action, current[action]);
		const unchanged = Object.entries(body).every(([field, value]) => sameValue(now[field], value));
		steps.push({ action, path: entry.path, method: entry.method, body, missing, unchanged });
	}

	return { steps, unusable, left };
}
