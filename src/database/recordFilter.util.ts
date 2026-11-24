import { isValidObjectId } from "mongoose";

/** A filter for one record in one server, so an id from another server finds nothing; null for an id that is no ObjectId. */
export function recordIn(guildId: string, id: string): { guildId: string; _id: string } | null {
	return isValidObjectId(id) ? { guildId, _id: id } : null;
}
