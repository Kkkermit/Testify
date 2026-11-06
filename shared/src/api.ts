import { type AccessArea, type AccessPerson } from "./access";

export interface ApiErrorBody {
	error: {
		code: string;
		message: string;
		issues?: { path: string; message: string }[];
	};
}

export interface HealthResponse {
	ok: boolean;
	uptimeMs: number;
	discord: "ready" | "connecting";
	database: "connected" | "disconnected";
}

/** Unauthenticated, so the sign-in screen can carry the bot's identity. */
export interface BotIdentity {
	id: string;
	name: string;
	username: string;
	avatarUrl: string;
	bannerUrl: string | null;
	/** The profile accent as a CSS hex, when the application has set one. */
	accentColour: string | null;
	supportUrl: string;
	repositoryUrl: string;
}

export interface DashboardUser {
	id: string;
	username: string;
	avatarUrl: string | null;
}

export interface ManageableGuild {
	id: string;
	name: string;
	iconUrl: string | null;
	memberCount: number | null;
	botPresent: boolean;
	canInvite: boolean;
	/** Null for somebody who manages the server and sees every screen; otherwise the screens they were given. */
	areas: AccessArea[] | null;
}

/** Everything the bot asks for on the invite, as one bitfield, rather than Administrator. */
export const INVITE_PERMISSIONS = "1374821936374";

export function inviteUrl(clientId: string, guildId?: string): string {
	const query = new URLSearchParams({
		client_id: clientId,
		permissions: INVITE_PERMISSIONS,
		scope: "bot applications.commands",
	});

	if (guildId !== undefined) {
		query.set("guild_id", guildId);
		// Discord greys the picker out on the consent screen, so the server they clicked from is the one they get.
		query.set("disable_guild_select", "true");
	}

	return `https://discord.com/oauth2/authorize?${query.toString()}`;
}

/** Why a signed-in account is blocked and whom to ask; such an account may only sign out and delete its data. */
export interface BlacklistNotice {
	reason: string;
	since: string;
	owners: { id: string; name: string }[];
}

export interface MeResponse {
	user: DashboardUser;
	isOwner: boolean;
	guilds: ManageableGuild[];
	blacklist: BlacklistNotice | null;
}

/** Told to an unauthenticated caller: which variables are missing, never their values. */
export interface SetupStatus {
	configured: boolean;
	missing: string[];
	redirectUri: string;
}

export type FeatureCount =
	| "events"
	| "birthdays"
	| "verified"
	| "roles"
	| "menus"
	| "channels"
	| "responders"
	| "messages"
	| "ticketsOpen"
	| "ticketsSold";

export type FeatureDetail =
	| { kind: "posting"; channelId: string }
	| { kind: "count"; what: FeatureCount; count: number }
	| { kind: "levelling"; rewards: number; boosts: number }
	| { kind: "holding"; days: number }
	| { kind: "watching" }
	| { kind: "bypass"; permission: string }
	| { kind: "countingAt"; count: number }
	| { kind: "starboard"; threshold: number; channelId: string }
	| { kind: "lobby"; channelId: string }
	| { kind: "treasure"; min: number; max: number }
	| { kind: "casino"; open: number; total: number };

export interface FeatureStatus {
	key: string;
	label: string;
	enabled: boolean;
	/** Null when there is nothing set up yet. */
	detail: FeatureDetail | null;
}

export const WATCHED_PERMISSIONS = [
	"ManageRoles",
	"ManageMessages",
	"ViewAuditLog",
	"ManageChannels",
	"AttachFiles",
] as const;

export type WatchedPermission = (typeof WATCHED_PERMISSIONS)[number];

/** What a screen can ask of its reader, as Discord names each permission. */
export const READER_PERMISSIONS = [
	"ManageGuild",
	"Administrator",
	"BanMembers",
	"KickMembers",
	"ModerateMembers",
	"ManageRoles",
	"ManageNicknames",
	"ManageChannels",
	"ManageMessages",
	"ViewAuditLog",
	"MentionEveryone",
] as const;

export type ReaderPermission = (typeof READER_PERMISSIONS)[number];

export interface AuditEntrySummary {
	actorTag: string;
	action: string;
	summary: string;
	at: string;
}

export interface GuildOverview {
	id: string;
	name: string;
	iconUrl: string | null;
	memberCount: number;
	channelCount: number;
	roleCount: number;
	features: FeatureStatus[];
	missingPermissions: WatchedPermission[];
	/** Which of `READER_PERMISSIONS` the person reading holds here; every one, for a bot owner. */
	yourPermissions: ReaderPermission[];
	/** Null for somebody who manages the server; otherwise the screens its admins gave them. */
	yourAreas: AccessArea[] | null;
	/** Empty, like `features`, for a reader without Manage Server, since both describe the server's settings. */
	recentChanges: AuditEntrySummary[];
}

export type ChannelKind = "text" | "announcement" | "voice" | "category" | "other";

export interface ChannelSummary {
	id: string;
	/** Null for a channel the reader cannot see in Discord, which the page names nowhere and offers nowhere. */
	name: string | null;
	kind: ChannelKind;
	position: number;
	parentId: string | null;
	canSend: boolean;
}

export interface RoleSummary {
	id: string;
	name: string;
	colour: string | null;
	position: number;
	managed: boolean;
	/** False when the role sits at or above the bot's own highest, which is the check that fails at runtime. */
	assignableByBot: boolean;
	/** Carries a moderation or admin permission, so it can never go on a menu members pick from. */
	powerful: boolean;
}

export interface OwnerStats {
	guilds: number;
	users: number;
	uptimeMs: number;
	memoryMb: number;
	commands: number;
	database: "connected" | "disconnected";
}

export interface OwnerGuildRow {
	id: string;
	name: string;
	iconUrl: string | null;
	memberCount: number;
	joinedAt: string | null;
	configured: string[];
	/** Commands run there in the last 30 days. */
	commands: number;
	/** Dashboard screens its managers opened in the last 30 days. */
	dashboardViews: number;
}

export interface Paged<T> {
	items: T[];
	total: number;
	page: number;
	perPage: number;
}

/** One person given part of a server's dashboard, and what they did there lately. */
export interface AccessActivity {
	person: AccessPerson;
	items: AuditEntrySummary[];
}
