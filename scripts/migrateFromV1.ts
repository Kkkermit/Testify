import mongoose from "mongoose";
import prompts from "prompts";
import { loadEnv } from "../src/config/env";
import { createLogger } from "../src/core/logger";
import { connectDatabase, disconnectDatabase } from "../src/database/connection";

/**
 * Renames v1's four-way-inconsistent field names onto v2's `camelCase` schema,
 * and folds the legacy ten-field economy model into the full one.
 *
 * Renaming a field in Mongo is a data migration, not a code change: without this
 * every read would come back undefined. Run `--dry-run` first.
 */

interface CollectionPlan {
	collection: string;
	rename: Record<string, string>;
	/** Fields that changed type, applied after the rename. */
	coerce?: { field: string; to: "boolean" | "number"; truthy?: string[] }[];
	drop?: string[];
}

const PLANS: CollectionPlan[] = [
	{
		collection: "economies",
		rename: {
			Guild: "guildId",
			User: "userId",
			Bank: "bank",
			Wallet: "wallet",
			Worked: "worked",
			Gambled: "gambled",
			Begged: "begged",
			DailyStreak: "dailyStreak",
			LastDaily: "lastDaily",
			HoursWorked: "hoursWorked",
			LastWorked: "lastWorked",
			CommandsRan: "commandsRan",
			Moderated: "moderated",
			Inventory: "inventory",
			Job: "job",
			JobLevel: "jobLevel",
			House: "house",
			Businesses: "businesses",
			RobberySuccess: "robberySuccess",
			RobberyFailed: "robberyFailed",
			LastRobbed: "lastRobbed",
			LastRobbedBy: "lastRobbedBy",
			HeistSuccess: "heistSuccess",
			HeistFailed: "heistFailed",
			LastHeist: "lastHeist",
			Pet: "pet",
		},
	},
	{ collection: "prefixes", rename: { Guild: "guildId", Prefix: "prefix", Enabled: "isEnabled" } },
	{ collection: "prefixsetupschemas", rename: { Guild: "guildId", Prefix: "prefix", Enabled: "isEnabled" } },
	{ collection: "links", rename: { Guild: "guildId", Perms: "bypassPermission" } },
	{ collection: "auditlogs", rename: { Guild: "guildId", Channel: "channelId", EnabledLogs: "enabledLogs" } },
	{ collection: "autoroles1742", rename: { GuildID: "guildId", Roles: "roleIds" } },
	{ collection: "blacklists", rename: {} },
	{
		collection: "countingschemas",
		rename: { Guild: "guildId", Channel: "channelId", Count: "count", MaxCount: "maxCount" },
	},
	{
		collection: "levelsetups",
		rename: {
			Guild: "guildId",
			Disabled: "isDisabled",
			Role: "roleId",
			Multi: "multiplier",
			LevelUpChannel: "levelUpChannelId",
		},
		coerce: [
			{ field: "isDisabled", to: "boolean", truthy: ["disabled", "true", "yes"] },
			{ field: "multiplier", to: "number" },
		],
	},
	{
		collection: "userlevels",
		rename: {
			Guild: "guildId",
			User: "userId",
			XP: "xp",
			Level: "level",
			Background: "background",
			BarColor: "barColor",
			BorderColor: "borderColor",
			Blur: "blur",
		},
	},
	{
		collection: "stickyschemas",
		rename: { Guild: "guildId", Channel: "channelId", Message: "message", Count: "count", Cap: "cap" },
	},
	{
		collection: "welcomemessages",
		rename: { channelId: "channelId", message: "message", isEmbed: "isEmbed" },
	},
	{ collection: "setupchannels", rename: { serverID: "guildId", channelID: "channelId", instruction: "instruction" } },
	{ collection: "voicechannelschemas", rename: { Guild: "guildId", TotalChannel: "memberChannelId" } },
	{ collection: "botvoicechannels", rename: { Guild: "guildId", BotChannel: "botChannelId" } },
	{
		collection: "guildchannelschemas",
		rename: { Guild: "guildId", Channel: "channelId", MessageId: "messageId", User: "userId" },
	},
	{
		collection: "treasureconfigs",
		rename: {
			Guild: "guildId",
			Enabled: "isEnabled",
			MinMessages: "minMessages",
			MaxMessages: "maxMessages",
			MinAmount: "minAmount",
			MaxAmount: "maxAmount",
			Cooldown: "cooldownMs",
			CreatedBy: "createdBy",
			LastModifiedBy: "lastModifiedBy",
		},
		drop: ["CreatedAt", "LastModifiedAt"],
	},
	{
		collection: "warntutorials",
		rename: { GuildID: "guildId", UserID: "userId", UserTag: "userTag", Content: "warnings" },
	},
	{
		collection: "ticketsetups",
		rename: {
			GuildID: "guildId",
			Channel: "channelId",
			Category: "categoryId",
			Transcripts: "transcriptChannelId",
			Handlers: "handlerRoleId",
			Everyone: "everyoneRoleId",
			Description: "description",
			Button: "buttonLabel",
			Emoji: "buttonEmoji",
		},
	},
	{
		collection: "tickets",
		rename: {
			GuildID: "guildId",
			OwnerID: "ownerId",
			MembersID: "memberIds",
			TicketID: "ticketId",
			ChannelID: "channelId",
			Locked: "isLocked",
			Claimed: "isClaimed",
			ClaimedBy: "claimedById",
		},
	},
	{
		collection: "verifies",
		rename: { Guild: "guildId", Channel: "channelId", Role: "roleId", Message: "messageId", Verified: "verifiedIds" },
	},
	{ collection: "verifyusers", rename: { Guild: "guildId", User: "userId", Key: "code" } },
	{
		collection: "lotteries",
		rename: {
			Guild: "guildId",
			Active: "isActive",
			Frozen: "isFrozen",
			EntryFee: "entryFee",
			PrizePool: "prizePool",
			BasePrizePool: "basePrizePool",
			MaxWinners: "maxWinners",
			Frequency: "frequency",
			NextDrawTime: "nextDrawTime",
			AnnouncementChannelId: "announcementChannelId",
			CreatedBy: "createdBy",
			LastModifiedBy: "lastModifiedBy",
			Entries: "entries",
			History: "history",
		},
		drop: ["CreatedAt", "LastModifiedAt", "LastDrawId"],
	},
	{
		collection: "instagramnotifications",
		rename: { Guild: "guildId", Channel: "channelId", InstagramUsers: "usernames", LastPostDates: "lastPostDates" },
	},
	{
		collection: "profiles",
		rename: { favoriteSong: "favouriteSong", favoriteGame: "favouriteGame" },
	},
	{ collection: "dmloggers", rename: { attachmentsData: "attachmentUrls" } },
	// Zero consumers in v1; nothing reads it in v2 either.
	{ collection: "leftusers", rename: {}, drop: [] },
];

const DRY_RUN = process.argv.includes("--dry-run");

async function migrate(): Promise<void> {
	const env = loadEnv();
	const logger = createLogger({ level: env.LOG_LEVEL, pretty: true });

	await connectDatabase({ uri: env.MONGODB_URI, logger });
	const db = mongoose.connection.db;
	if (!db) throw new Error("No database handle after connecting");

	console.log(`Database: ${mongoose.connection.name}`);
	console.log(DRY_RUN ? "Dry run — nothing will be written.\n" : "Applying changes.\n");

	if (!DRY_RUN) {
		const { confirmation } = await prompts({
			type: "text",
			name: "confirmation",
			message: `Back up first. Type "${mongoose.connection.name}" to continue`,
		});

		if (confirmation !== mongoose.connection.name) {
			console.log("Cancelled.");
			await disconnectDatabase();
			return;
		}
	}

	const existing = new Set((await db.collections()).map((collection) => collection.collectionName));

	for (const plan of PLANS) {
		if (!existing.has(plan.collection)) continue;

		const collection = db.collection(plan.collection);
		const total = await collection.countDocuments();
		if (total === 0) continue;

		// Only rename keys that are actually present, so a partially migrated
		// database can be re-run safely.
		const present = Object.entries(plan.rename).filter(([from]) => from !== plan.rename[from]);
		const applicable: Record<string, string> = {};

		for (const [from, to] of present) {
			if ((await collection.countDocuments({ [from]: { $exists: true } })) > 0) applicable[from] = to;
		}

		const dropping = plan.drop ?? [];

		console.log(`${plan.collection}: ${total} document(s)`);
		if (Object.keys(applicable).length > 0) console.log(`  rename ${Object.keys(applicable).join(", ")}`);
		if (dropping.length > 0) console.log(`  drop   ${dropping.join(", ")}`);

		if (DRY_RUN) continue;

		if (Object.keys(applicable).length > 0) {
			await collection.updateMany({}, { $rename: applicable });
		}
		if (dropping.length > 0) {
			await collection.updateMany({}, { $unset: Object.fromEntries(dropping.map((field) => [field, ""])) });
		}

		for (const rule of plan.coerce ?? []) {
			const documents = await collection.find({ [rule.field]: { $type: "string" } }).toArray();

			for (const document of documents) {
				const raw = String(document[rule.field] ?? "").toLowerCase();
				const value =
					rule.to === "boolean"
						? (rule.truthy ?? ["true"]).includes(raw)
						: Number.isNaN(Number.parseFloat(raw))
							? 1
							: Number.parseFloat(raw);

				await collection.updateOne({ _id: document._id }, { $set: { [rule.field]: value } });
			}

			if (documents.length > 0) console.log(`  coerce ${rule.field} → ${rule.to} (${documents.length})`);
		}
	}

	console.log(DRY_RUN ? "\nDry run complete." : "\nMigration complete. Restart the bot.");
	await disconnectDatabase();
}

migrate().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
