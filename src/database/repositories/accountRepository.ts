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
import { DmLog, Softban, WarnLadderConfig, Warnings } from "@database/models/moderation.schema";
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
import { DELETED_USER_ID, DELETED_USER_NAME } from "@testify/shared";

/** `delete` drops the record, `remove` takes the id off a list, `anonymise` swaps it for `DELETED_USER_ID`. */
export type Erasure = "delete" | "remove" | "anonymise" | "keep";

/**
 * Every field that can hold a person's id, by collection, and what deleting their data does to it; moderation records
 * about them are kept, and a test fails on a schema field this does not name.
 */
export const ERASURE = {
	afk: { userId: "delete" },
	autoresponders: { updatedBy: "anonymise" },
	birthdays: { userId: "delete" },
	birthdaysettings: { updatedBy: "anonymise" },
	blacklist: { userId: "keep" },
	botnotices: { authorId: "anonymise" },
	botsettings: { updatedBy: "anonymise" },
	casinohands: { userId: "delete" },
	casinosettings: { updatedBy: "anonymise" },
	casinostats: { userId: "delete" },
	commandrun: { userId: "delete" },
	commandtoggles: { updatedBy: "anonymise" },
	countingSchema: { lastUserId: "anonymise" },
	dashboardaudit: { actorId: "anonymise" },
	dashboardsession: { userId: "delete" },
	DmLogger: { authorId: "delete" },
	Economy: { userId: "delete", lastRobbedBy: "anonymise" },
	giveaways_x: { hostedBy: "anonymise", winnerIds: "anonymise" },
	goodbyesettings: { updatedBy: "anonymise" },
	guildChannelSchema: { userId: "anonymise" },
	ideas: { authorId: "delete", decidedBy: "anonymise", upVoters: "remove", downVoters: "remove" },
	ideasettings: { updatedBy: "anonymise" },
	Lottery: {
		createdBy: "anonymise",
		lastModifiedBy: "anonymise",
		"entries.userId": "remove",
		"history.winners.userId": "anonymise",
	},
	memberday: { userId: "delete" },
	membermove: { userId: "delete" },
	modcases: { userId: "keep", moderatorId: "anonymise" },
	modcasesettings: { updatedBy: "anonymise" },
	musicsettings: { updatedBy: "anonymise" },
	noticereaders: { userId: "delete" },
	Profile: { userId: "delete" },
	raidsettings: { updatedBy: "anonymise" },
	reminders: { userId: "delete" },
	rolemenus: { updatedBy: "anonymise" },
	rouletterounds: { hostId: "anonymise", players: "remove" },
	scheduledmessages: { updatedBy: "anonymise" },
	SoftbanEntry: { userId: "keep", moderatorId: "anonymise" },
	starboardsettings: { updatedBy: "anonymise" },
	starposts: { authorId: "anonymise" },
	tempvoicechannels: { ownerId: "anonymise" },
	tempvoicesettings: { updatedBy: "anonymise" },
	Ticket: { ownerId: "anonymise", memberIds: "remove", claimedById: "anonymise" },
	TreasureConfig: { createdBy: "anonymise", lastModifiedBy: "anonymise" },
	UserLevel: { userId: "delete" },
	verify: { verifiedIds: "remove" },
	verifyusers: { userId: "delete" },
	warnpunishments: { lastModifiedBy: "anonymise" },
	warnTutorial: { userId: "keep", "warnings.executorId": "anonymise", "warnings.edits.editedById": "anonymise" },
} as const satisfies Record<string, Record<string, Erasure>>;

/** An idea the person posted, whose post in Discord carries their words. */
export interface ErasedIdeaPost {
	channelId: string;
	messageId: string;
}

/** Applies `ERASURE` to one person; it cannot be undone, and the idea posts it returns are the caller's to take down. */
export async function eraseUserData(userId: string): Promise<ErasedIdeaPost[]> {
	const gone = DELETED_USER_ID;
	const name = DELETED_USER_NAME;
	const posts = await Idea.find({ authorId: userId }, { channelId: 1, messageId: 1 })
		.lean<{ channelId: string; messageId: string | null }[]>()
		.exec();

	await Promise.all([
		AfkStatus.deleteMany({ userId }).exec(),
		SharedBirthday.deleteMany({ userId }).exec(),
		CasinoHand.deleteMany({ userId }).exec(),
		CasinoStats.deleteMany({ userId }).exec(),
		CommandRuns.deleteMany({ userId }).exec(),
		DashboardSessions.deleteMany({ userId }).exec(),
		DmLog.deleteMany({ authorId: userId }).exec(),
		Economy.deleteMany({ userId }).exec(),
		Idea.deleteMany({ authorId: userId }).exec(),
		MemberDays.deleteMany({ userId }).exec(),
		MemberMoves.deleteMany({ userId }).exec(),
		NoticeReader.deleteMany({ userId }).exec(),
		PendingVerify.deleteMany({ userId }).exec(),
		Profile.deleteMany({ userId }).exec(),
		Reminder.deleteMany({ userId }).exec(),
		UserLevel.deleteMany({ userId }).exec(),

		Economy.updateMany({ lastRobbedBy: userId }, { $set: { lastRobbedBy: null } }).exec(),
		Counting.updateMany({ lastUserId: userId }, { $set: { lastUserId: null } }).exec(),
		Idea.updateMany(
			{ $or: [{ upVoters: userId }, { downVoters: userId }] },
			{ $pull: { upVoters: userId, downVoters: userId } },
		).exec(),
		Idea.updateMany({ decidedBy: userId }, { $set: { decidedBy: null, decidedByName: null } }).exec(),
		Lottery.updateMany({ "entries.userId": userId }, { $pull: { entries: { userId } } }).exec(),
		Lottery.updateMany(
			{ "history.winners.userId": userId },
			{ $set: { "history.$[].winners.$[winner].userId": gone, "history.$[].winners.$[winner].userTag": name } },
			{ arrayFilters: [{ "winner.userId": userId }] },
		).exec(),
		Lottery.updateMany({ createdBy: userId }, { $set: { createdBy: gone } }).exec(),
		Lottery.updateMany({ lastModifiedBy: userId }, { $set: { lastModifiedBy: gone } }).exec(),
		TreasureConfig.updateMany({ createdBy: userId }, { $set: { createdBy: gone } }).exec(),
		TreasureConfig.updateMany({ lastModifiedBy: userId }, { $set: { lastModifiedBy: gone } }).exec(),
		WarnLadderConfig.updateMany({ lastModifiedBy: userId }, { $set: { lastModifiedBy: gone } }).exec(),
		Warnings.updateMany(
			{ "warnings.executorId": userId },
			{ $set: { "warnings.$[warning].executorId": gone, "warnings.$[warning].executorTag": name } },
			{ arrayFilters: [{ "warning.executorId": userId }] },
		).exec(),
		Warnings.updateMany(
			{ "warnings.edits.editedById": userId },
			{ $set: { "warnings.$[].edits.$[edit].editedById": gone, "warnings.$[].edits.$[edit].editedByTag": name } },
			{ arrayFilters: [{ "edit.editedById": userId }] },
		).exec(),
		ModCaseEntry.updateMany({ moderatorId: userId }, { $set: { moderatorId: gone, moderatorName: name } }).exec(),
		Softban.updateMany({ moderatorId: userId }, { $set: { moderatorId: gone } }).exec(),
		DashboardAudits.updateMany({ actorId: userId }, { $set: { actorId: gone, actorTag: name } }).exec(),
		BotNotice.updateMany({ authorId: userId }, { $set: { authorId: gone } }).exec(),
		FixedStats.updateMany({ userId }, { $set: { userId: gone } }).exec(),
		StarPost.updateMany({ authorId: userId }, { $set: { authorId: gone } }).exec(),
		TempChannel.updateMany({ ownerId: userId }, { $set: { ownerId: gone } }).exec(),
		Ticket.updateMany({ ownerId: userId }, { $set: { ownerId: gone } }).exec(),
		Ticket.updateMany({ claimedById: userId }, { $set: { claimedById: gone } }).exec(),
		Ticket.updateMany({ memberIds: userId }, { $pull: { memberIds: userId } }).exec(),
		VerifyConfig.updateMany({ verifiedIds: userId }, { $pull: { verifiedIds: userId } }).exec(),
		Giveaway.updateMany({ winnerIds: userId }, { $set: { "winnerIds.$": gone } }).exec(),
		Giveaway.updateMany({ hostedBy: `<@${userId}>` }, { $unset: { hostedBy: 1 } }).exec(),
		RouletteRound.updateMany({ hostId: userId }, { $set: { hostId: gone, hostName: name } }).exec(),
		RouletteRound.updateMany(
			{ [`players.${userId}`]: { $exists: true } },
			{ $unset: { [`players.${userId}`]: 1 } },
		).exec(),

		AutoResponderEntry.updateMany({ updatedBy: userId }, { $set: { updatedBy: null } }).exec(),
		BirthdaySettingsConfig.updateMany({ updatedBy: userId }, { $set: { updatedBy: null } }).exec(),
		BotSettingsConfig.updateMany({ updatedBy: userId }, { $set: { updatedBy: null } }).exec(),
		CasinoSettingsConfig.updateMany({ updatedBy: userId }, { $set: { updatedBy: null } }).exec(),
		CommandToggleConfig.updateMany({ updatedBy: userId }, { $set: { updatedBy: null } }).exec(),
		GoodbyeSettingsConfig.updateMany({ updatedBy: userId }, { $set: { updatedBy: null } }).exec(),
		IdeaSettingsConfig.updateMany({ updatedBy: userId }, { $set: { updatedBy: null } }).exec(),
		ModCaseSettings.updateMany({ updatedBy: userId }, { $set: { updatedBy: null } }).exec(),
		MusicSettingsConfig.updateMany({ updatedBy: userId }, { $set: { updatedBy: null } }).exec(),
		RaidSettingsConfig.updateMany({ updatedBy: userId }, { $set: { updatedBy: null } }).exec(),
		RoleMenu.updateMany({ updatedBy: userId }, { $set: { updatedBy: null } }).exec(),
		ScheduledPost.updateMany({ updatedBy: userId }, { $set: { updatedBy: null } }).exec(),
		StarboardSettingsConfig.updateMany({ updatedBy: userId }, { $set: { updatedBy: null } }).exec(),
		TempVoiceSettingsConfig.updateMany({ updatedBy: userId }, { $set: { updatedBy: null } }).exec(),
	]);

	return posts.flatMap((post) =>
		post.messageId === null ? [] : [{ channelId: post.channelId, messageId: post.messageId }],
	);
}
