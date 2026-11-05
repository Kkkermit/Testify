import { readdirSync } from "node:fs";
import { join } from "node:path";
import mongoose, { type Schema } from "mongoose";
import { describeWithMongo } from "../helpers/mongo";
import { AfkStatus } from "@database/models/afk.schema";
import { AutoResponderEntry } from "@database/models/autoResponder.schema";
import { BirthdaySettingsConfig, SharedBirthday } from "@database/models/birthday.schema";
import { BotSettingsConfig } from "@database/models/botSettings.schema";
import { FixedStats } from "@database/models/botStats.schema";
import { CasinoHand } from "@database/models/casinoHand.schema";
import { CasinoSettingsConfig } from "@database/models/casinoSettings.schema";
import { CasinoStats } from "@database/models/casinoStats.schema";
import { CommandRuns } from "@database/models/commandRuns.schema";
import { CommandToggleConfig } from "@database/models/commandToggles.schema";
import { Counting } from "@database/models/counting.schema";
import { DashboardAudits } from "@database/models/dashboardAudit.schema";
import { DashboardSessions } from "@database/models/dashboardSession.schema";
import { Economy } from "@database/models/economy.schema";
import { Giveaway } from "@database/models/giveaway.schema";
import { GoodbyeSettingsConfig } from "@database/models/goodbye.schema";
import { Idea, IdeaSettingsConfig } from "@database/models/idea.schema";
import { MemberDays, MemberMoves } from "@database/models/insights.schema";
import { UserLevel } from "@database/models/levelling.schema";
import { Lottery } from "@database/models/lottery.schema";
import { ModCaseEntry, ModCaseSettings } from "@database/models/modCase.schema";
import { Blacklist, DmLog, Softban, WarnLadderConfig, Warnings } from "@database/models/moderation.schema";
import { MusicSettingsConfig } from "@database/models/musicSettings.schema";
import { BotNotice, NoticeReader } from "@database/models/notice.schema";
import { Profile } from "@database/models/profile.schema";
import { RaidSettingsConfig } from "@database/models/raid.schema";
import { Reminder } from "@database/models/reminder.schema";
import { RoleMenu } from "@database/models/roleMenu.schema";
import { RouletteRound } from "@database/models/rouletteRound.schema";
import { ScheduledPost } from "@database/models/scheduledMessage.schema";
import { StarboardSettingsConfig, StarPost } from "@database/models/starboard.schema";
import { TempChannel, TempVoiceSettingsConfig } from "@database/models/tempVoice.schema";
import { Ticket } from "@database/models/tickets.schema";
import { TreasureConfig } from "@database/models/treasure.schema";
import { PendingVerify, VerifyConfig } from "@database/models/verification.schema";
import { ERASURE, eraseUserData } from "@database/repositories/accountRepository";
import { DELETED_USER_ID, DELETED_USER_NAME } from "@testify/shared";

const PERSON = "100000000000000001";
const OTHER = "100000000000000002";
const GUILD = "900000000000000001";

/** Field names that end like a person's but never hold one. */
const NOT_A_PERSON = new Set([
	"alertChannelId",
	"announcementChannelId",
	"boardChannelId",
	"boardMessageId",
	"botChannelId",
	"businessId",
	"categoryId",
	"channelId",
	"djRoleIds",
	"everyoneRoleId",
	"guildId",
	"handlerRoleId",
	"houseId",
	"ignoredChannelIds",
	"ignoredRoleIds",
	"itemId",
	"lastMessageId",
	"levelUpChannelId",
	"lobbyChannelId",
	"logChannelId",
	"memberChannelId",
	"messageId",
	"petId",
	"pingRoleId",
	"roleId",
	"roleIds",
	"ticketId",
	"transcriptChannelId",
	"warnId",
]);

const MAY_HOLD_A_PERSON = /(?:Id|Ids|By|Voters)$|^players$/;

function personPaths(schema: Schema, prefix = ""): string[] {
	const found: string[] = [];
	schema.eachPath((path, type) => {
		const nested = (type as { schema?: Schema }).schema;
		const name = path.split(".").at(-1) ?? path;
		if (nested !== undefined) found.push(...personPaths(nested, `${prefix}${path}.`));
		else if (MAY_HOLD_A_PERSON.test(name) && !NOT_A_PERSON.has(name)) found.push(`${prefix}${path}`);
	});
	return found;
}

/**
 * A collection added with a user id, or a field added to one, has to say what deleting somebody's data does to it,
 * or the delete quietly leaves that person behind.
 */
describe("what deleting somebody's data covers", () => {
	beforeAll(async () => {
		const models = join(__dirname, "../../src/database/models");
		await Promise.all(
			readdirSync(models).map(async (file) => {
				await import(join(models, file));
			}),
		);
	});

	it("names every field in every schema that can hold a person, and nothing that is not there", () => {
		const covered = ERASURE as Record<string, Record<string, string>>;
		const missing: string[] = [];
		const stale: string[] = [];

		for (const name of mongoose.modelNames()) {
			const paths = personPaths(mongoose.model(name).schema);
			for (const path of paths) if (covered[name]?.[path] === undefined) missing.push(`${name}.${path}`);
			for (const path of Object.keys(covered[name] ?? {})) if (!paths.includes(path)) stale.push(`${name}.${path}`);
		}
		for (const name of Object.keys(covered)) if (!mongoose.modelNames().includes(name)) stale.push(name);

		expect({ missing, stale }).toEqual({ missing: [], stale: [] });
	});
});

const SETTINGS = [
	AutoResponderEntry,
	BirthdaySettingsConfig,
	BotSettingsConfig,
	CasinoSettingsConfig,
	CommandToggleConfig,
	GoodbyeSettingsConfig,
	IdeaSettingsConfig,
	ModCaseSettings,
	MusicSettingsConfig,
	RaidSettingsConfig,
	RoleMenu,
	ScheduledPost,
	StarboardSettingsConfig,
	TempVoiceSettingsConfig,
] as const;

const THEIRS = [
	AfkStatus,
	SharedBirthday,
	CasinoHand,
	CasinoStats,
	CommandRuns,
	DashboardSessions,
	Economy,
	MemberDays,
	MemberMoves,
	NoticeReader,
	PendingVerify,
	Profile,
	Reminder,
	UserLevel,
] as const;

describeWithMongo("eraseUserData", () => {
	/** Raw inserts, so a record needs only the fields the delete reads. */
	async function seed(): Promise<void> {
		await Promise.all(THEIRS.map((model) => model.collection.insertOne({ guildId: GUILD, userId: PERSON })));
		await Promise.all(SETTINGS.map((model) => model.collection.insertOne({ guildId: GUILD, updatedBy: PERSON })));
		await Promise.all([
			Economy.collection.insertOne({ guildId: GUILD, userId: OTHER, lastRobbedBy: PERSON }),
			Counting.collection.insertOne({ guildId: GUILD, lastUserId: PERSON }),
			DmLog.collection.insertOne({ messageId: "1", authorId: PERSON, content: "hello" }),
			Idea.collection.insertMany([
				{
					guildId: GUILD,
					number: 1,
					channelId: "400000000000000001",
					messageId: "500000000000000001",
					authorId: PERSON,
				},
				{
					guildId: GUILD,
					number: 2,
					authorId: OTHER,
					upVoters: [PERSON, OTHER],
					downVoters: [PERSON],
					decidedBy: PERSON,
					decidedByName: "person",
				},
			]),
			Lottery.collection.insertOne({
				guildId: GUILD,
				createdBy: PERSON,
				lastModifiedBy: PERSON,
				entries: [
					{ userId: PERSON, userTag: "person", tickets: 2 },
					{ userId: OTHER, userTag: "other", tickets: 1 },
				],
				history: [
					{
						winners: [
							{ userId: PERSON, userTag: "person", prizeAmount: 5 },
							{ userId: OTHER, userTag: "other" },
						],
					},
					{ winners: [] },
				],
			}),
			TreasureConfig.collection.insertOne({ guildId: GUILD, createdBy: PERSON, lastModifiedBy: PERSON }),
			WarnLadderConfig.collection.insertOne({ guildId: GUILD, lastModifiedBy: PERSON }),
			Warnings.collection.insertMany([
				{ guildId: GUILD, userId: PERSON, userTag: "person", warnings: [{ executorId: OTHER, executorTag: "other" }] },
				{
					guildId: GUILD,
					userId: OTHER,
					userTag: "other",
					warnings: [
						{
							executorId: PERSON,
							executorTag: "person",
							edits: [{ editedById: PERSON, editedByTag: "person" }],
						},
						{ executorId: PERSON, executorTag: "person", edits: [] },
					],
				},
			]),
			ModCaseEntry.collection.insertMany([
				{ guildId: GUILD, number: 1, userId: PERSON, moderatorId: OTHER, moderatorName: "other" },
				{ guildId: GUILD, number: 2, userId: OTHER, moderatorId: PERSON, moderatorName: "person" },
			]),
			Softban.collection.insertMany([
				{ guildId: GUILD, userId: PERSON, moderatorId: OTHER },
				{ guildId: GUILD, userId: OTHER, moderatorId: PERSON },
			]),
			Blacklist.collection.insertOne({ userId: PERSON, reason: "spam" }),
			DashboardAudits.collection.insertOne({ actorId: PERSON, actorTag: "person", guildId: GUILD }),
			BotNotice.collection.insertOne({ title: "Hi", authorId: PERSON }),
			FixedStats.collection.insertOne({ guildId: GUILD, userId: PERSON }),
			StarPost.collection.insertOne({ guildId: GUILD, messageId: "2", authorId: PERSON }),
			TempChannel.collection.insertOne({ guildId: GUILD, channelId: "3", ownerId: PERSON }),
			Ticket.collection.insertOne({
				guildId: GUILD,
				ticketId: "a",
				channelId: "4",
				ownerId: PERSON,
				claimedById: PERSON,
				memberIds: [PERSON, OTHER],
			}),
			VerifyConfig.collection.insertOne({ guildId: GUILD, verifiedIds: [PERSON, OTHER] }),
			Giveaway.collection.insertOne({
				messageId: "5",
				guildId: GUILD,
				winnerIds: [PERSON, OTHER],
				hostedBy: `<@${PERSON}>`,
			}),
			RouletteRound.collection.insertOne({
				guildId: GUILD,
				hostId: PERSON,
				hostName: "person",
				status: "settled",
				players: { [PERSON]: { name: "person", bets: [] }, [OTHER]: { name: "other", bets: [] } },
			}),
		]);
	}

	it("deletes what is theirs, takes them off what is shared, anonymises what servers keep, and keeps moderation", async () => {
		await seed();

		const posts = await eraseUserData(PERSON);

		expect(posts).toEqual([{ channelId: "400000000000000001", messageId: "500000000000000001" }]);

		const left = await Promise.all(THEIRS.map(async (model) => model.collection.countDocuments({ userId: PERSON })));
		expect(left.every((count) => count === 0)).toBe(true);
		expect(await DmLog.collection.countDocuments({ authorId: PERSON })).toBe(0);
		expect(await Idea.collection.countDocuments({ authorId: PERSON })).toBe(0);
		expect(await Economy.collection.findOne({ userId: OTHER })).toMatchObject({ lastRobbedBy: null });

		const settings = await Promise.all(SETTINGS.map(async (model) => model.collection.findOne({ guildId: GUILD })));
		expect(settings.map((record): unknown => record?.["updatedBy"])).toEqual(SETTINGS.map(() => null));

		expect(await Counting.collection.findOne({ guildId: GUILD })).toMatchObject({ lastUserId: null });
		expect(await Idea.collection.findOne({ number: 2 })).toMatchObject({
			upVoters: [OTHER],
			downVoters: [],
			decidedBy: null,
			decidedByName: null,
		});

		const lottery = await Lottery.collection.findOne({ guildId: GUILD });
		expect(lottery).toMatchObject({
			createdBy: DELETED_USER_ID,
			lastModifiedBy: DELETED_USER_ID,
			entries: [{ userId: OTHER }],
			history: [
				{
					winners: [
						{ userId: DELETED_USER_ID, userTag: DELETED_USER_NAME },
						{ userId: OTHER, userTag: "other" },
					],
				},
				{ winners: [] },
			],
		});
		expect(await TreasureConfig.collection.findOne({ guildId: GUILD })).toMatchObject({
			createdBy: DELETED_USER_ID,
			lastModifiedBy: DELETED_USER_ID,
		});
		expect(await WarnLadderConfig.collection.findOne({ guildId: GUILD })).toMatchObject({
			lastModifiedBy: DELETED_USER_ID,
		});

		expect(await Warnings.collection.findOne({ userId: PERSON })).toMatchObject({
			userTag: "person",
			warnings: [{ executorId: OTHER, executorTag: "other" }],
		});
		expect(await Warnings.collection.findOne({ userId: OTHER })).toMatchObject({
			warnings: [
				{
					executorId: DELETED_USER_ID,
					executorTag: DELETED_USER_NAME,
					edits: [{ editedById: DELETED_USER_ID, editedByTag: DELETED_USER_NAME }],
				},
				{ executorId: DELETED_USER_ID, executorTag: DELETED_USER_NAME },
			],
		});

		expect(await ModCaseEntry.collection.findOne({ number: 1 })).toMatchObject({ userId: PERSON, moderatorId: OTHER });
		expect(await ModCaseEntry.collection.findOne({ number: 2 })).toMatchObject({
			moderatorId: DELETED_USER_ID,
			moderatorName: DELETED_USER_NAME,
		});
		expect(await Softban.collection.findOne({ userId: PERSON })).toMatchObject({ moderatorId: OTHER });
		expect(await Softban.collection.findOne({ userId: OTHER })).toMatchObject({ moderatorId: DELETED_USER_ID });
		expect(await Blacklist.collection.findOne({ userId: PERSON })).toMatchObject({ reason: "spam" });

		expect(await DashboardAudits.collection.findOne({ guildId: GUILD })).toMatchObject({
			actorId: DELETED_USER_ID,
			actorTag: DELETED_USER_NAME,
		});
		expect(await BotNotice.collection.findOne({ title: "Hi" })).toMatchObject({ authorId: DELETED_USER_ID });
		expect(await FixedStats.collection.findOne({ guildId: GUILD })).toMatchObject({ userId: DELETED_USER_ID });
		expect(await StarPost.collection.findOne({ messageId: "2" })).toMatchObject({ authorId: DELETED_USER_ID });
		expect(await TempChannel.collection.findOne({ channelId: "3" })).toMatchObject({ ownerId: DELETED_USER_ID });
		expect(await Ticket.collection.findOne({ channelId: "4" })).toMatchObject({
			ownerId: DELETED_USER_ID,
			claimedById: DELETED_USER_ID,
			memberIds: [OTHER],
		});
		expect(await VerifyConfig.collection.findOne({ guildId: GUILD })).toMatchObject({ verifiedIds: [OTHER] });

		const giveaway = await Giveaway.collection.findOne({ messageId: "5" });
		expect(giveaway).toMatchObject({ winnerIds: [DELETED_USER_ID, OTHER] });
		expect(giveaway).not.toHaveProperty("hostedBy");

		const round = await RouletteRound.collection.findOne({ guildId: GUILD });
		expect(round).toMatchObject({ hostId: DELETED_USER_ID, hostName: DELETED_USER_NAME });
		expect(Object.keys((round?.["players"] ?? {}) as object)).toEqual([OTHER]);
	});
});
