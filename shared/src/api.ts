/** Every error the API returns has this shape, so the client can branch on `code`. */
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

/** The bot's public profile, unauthenticated so the sign-in screen can carry the bot's identity. */
export interface BotIdentity {
	id: string;
	username: string;
	avatarUrl: string;
	/** Applications rarely have one, so every surface needs a fallback. */
	bannerUrl: string | null;
	/** The profile accent as a CSS hex, when the application has set one. */
	accentColour: string | null;
	/** Where to ask for help, and where the code is. Both come from the bot's own theme, so a fork points at its own. */
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
	/** Whether this person could add Testify, which needs Manage Server. */
	canInvite: boolean;
}

/** Everything Testify asks for on the invite, as one bitfield, rather than Administrator. */
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

export interface MeResponse {
	user: DashboardUser;
	isOwner: boolean;
	guilds: ManageableGuild[];
}

/** Told to an unauthenticated caller: which variables are missing, never their values. */
export interface SetupStatus {
	configured: boolean;
	missing: string[];
	redirectUri: string;
}

export interface FeatureStatus {
	key: string;
	label: string;
	enabled: boolean;
	/** A one-line summary of the configuration, or null when there is nothing set up yet. */
	detail: string | null;
}

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
	/** Permissions the bot is missing that some configured feature needs, in a form fit to show a person. */
	missingPermissions: string[];
	recentChanges: AuditEntrySummary[];
}

export type ChannelKind = "text" | "announcement" | "voice" | "category" | "other";

export interface ChannelSummary {
	id: string;
	name: string;
	kind: ChannelKind;
	position: number;
	/** Computed from the live client, so a channel the bot cannot post in is greyed out before anyone saves. */
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
}

export interface Paged<T> {
	items: T[];
	total: number;
	page: number;
	perPage: number;
}
