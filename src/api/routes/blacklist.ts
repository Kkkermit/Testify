import { type User } from "discord.js";
import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings } from "@api/context";
import { badRequest, notFound } from "@api/errors";
import { requireOwner } from "@api/middleware/session";
import { parseBody, parseParams } from "@api/validate";
import { type TestifyClient } from "@core/client";
import {
	addToBlacklist,
	findBlacklistEntry,
	listBlacklist,
	removeFromBlacklist,
} from "@database/repositories/blacklistRepository";
import { blacklistProblem } from "@lib/moderation";
import { blacklistAdd, type BlacklistRow, blacklistUserParam } from "@testify/shared";

/** The bot-wide block list, owner-only. `/blacklist` in Discord is the same three actions on the same store. */

export const blacklist = new Hono<ApiBindings>();

blacklist.use("*", requireOwner);

blacklist.get("/", async (context) => {
	const entries = await listBlacklist();

	return context.json(await Promise.all(entries.map((entry) => toRow(context.get("client"), entry))));
});

blacklist.post("/", async (context) => {
	const client = context.get("client");
	const { userId, reason } = await parseBody(context, blacklistAdd);

	const problem = blacklistProblem(client, userId);
	if (problem !== null) throw badRequest(problem);

	const entry = await addToBlacklist(userId, reason === "" ? "No reason provided" : reason);

	await auditChange(context, {
		action: "blacklist.add",
		summary: `Blacklisted ${userId}`,
		after: { userId, reason: entry.reason },
	});

	return context.json(await toRow(client, entry));
});

blacklist.delete("/:userId", async (context) => {
	const { userId } = parseParams(context, blacklistUserParam);

	// Read first, so the audit record can say who was lifted rather than only that something was.
	const existing = await findBlacklistEntry(userId);
	const removed = await removeFromBlacklist(userId);
	if (!removed) throw notFound("not_blacklisted", "That user is not blacklisted.");

	await auditChange(context, {
		action: "blacklist.remove",
		summary: `Removed ${userId} from the blacklist`,
		before: { userId, reason: existing?.reason ?? null },
	});

	return context.json({ userId });
});

/** Looks the account up over REST, since the cache rarely has it; a deleted account still gets a row. */
async function toRow(
	client: TestifyClient,
	entry: { userId: string; reason: string; createdAt: Date },
): Promise<BlacklistRow> {
	const user: User | null =
		client.users.cache.get(entry.userId) ?? (await client.users.fetch(entry.userId).catch(() => null));

	return {
		userId: entry.userId,
		tag: user?.tag ?? null,
		avatarUrl: user?.displayAvatarURL({ extension: "png", size: 64 }) ?? null,
		reason: entry.reason,
		createdAt: entry.createdAt.toISOString(),
	};
}
