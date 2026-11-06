import { isValidObjectId } from "mongoose";

/** One record in one server, or null for an id that is not an ObjectId, so a malformed id finds nothing rather than throwing. */
export function recordIn(guildId: string, id: string): { guildId: string; _id: string } | null {
	return isValidObjectId(id) ? { guildId, _id: id } : null;
}
