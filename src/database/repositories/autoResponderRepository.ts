import { isValidObjectId, type Types } from "mongoose";
import { isDuplicateKey } from "@database/duplicateKey.util";
import { AutoResponderEntry, type AutoResponderRecord } from "@database/models/autoResponder.schema";
import { ReadCache } from "@database/readCache.util";
import { type AutoResponder, type AutoResponderInput, triggerKey } from "@testify/shared";

type Row = AutoResponderRecord & { _id: Types.ObjectId };

/** Every server's responders, asked on every message, so they are cached and replaced on every write. */
const cache = new ReadCache<AutoResponder[]>();

function toResponder(row: Row): AutoResponder {
	return { id: row._id.toString(), trigger: row.trigger, match: row.match, reply: row.reply };
}

/** Oldest first, which is the order the panel and the dashboard list them in and the order they are tried. */
export async function listAutoResponders(guildId: string): Promise<AutoResponder[]> {
	return cache.read(guildId, async () => {
		const rows = await AutoResponderEntry.find({ guildId }).sort({ createdAt: 1, _id: 1 }).lean<Row[]>().exec();
		return rows.map(toResponder);
	});
}

export async function findAutoResponder(guildId: string, id: string): Promise<AutoResponder | null> {
	if (!isValidObjectId(id)) return null;
	const row = await AutoResponderEntry.findOne({ _id: id, guildId }).lean<Row>().exec();
	return row === null ? null : toResponder(row);
}

/** Null when the server already has a responder for the same words. */
export async function createAutoResponder(
	guildId: string,
	input: AutoResponderInput,
	updatedBy: string | null,
): Promise<AutoResponder | null> {
	try {
		const row = await AutoResponderEntry.create({ guildId, ...input, key: triggerKey(input.trigger), updatedBy });
		return toResponder(row.toObject<Row>());
	} catch (error) {
		if (isDuplicateKey(error)) return null;
		throw error;
	} finally {
		cache.forget(guildId);
	}
}

/** `missing` when there is no such responder here, `duplicate` when another already has the new words. */
export async function updateAutoResponder(
	guildId: string,
	id: string,
	input: AutoResponderInput,
	updatedBy: string | null,
): Promise<AutoResponder | "missing" | "duplicate"> {
	if (!isValidObjectId(id)) return "missing";

	try {
		const row = await AutoResponderEntry.findOneAndUpdate(
			{ _id: id, guildId },
			{ $set: { ...input, key: triggerKey(input.trigger), updatedBy } },
			{ new: true },
		)
			.lean<Row>()
			.exec();
		return row === null ? "missing" : toResponder(row);
	} catch (error) {
		if (isDuplicateKey(error)) return "duplicate";
		throw error;
	} finally {
		cache.forget(guildId);
	}
}

export async function deleteAutoResponder(guildId: string, id: string): Promise<boolean> {
	if (!isValidObjectId(id)) return false;
	const { deletedCount } = await AutoResponderEntry.deleteOne({ _id: id, guildId }).exec();
	cache.forget(guildId);
	return deletedCount > 0;
}

/** Used by the tests, so no suite inherits another's responders. */
export function clearAutoResponderCache(): void {
	cache.clear();
}

export async function purgeAutoResponders(guildId: string): Promise<void> {
	await AutoResponderEntry.deleteMany({ guildId }).exec();
	cache.forget(guildId);
}
