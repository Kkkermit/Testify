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

/**
 * The bot's own public profile, as anybody sees it in Discord. Unauthenticated: it lets the sign-in screen and
 * the sidebar carry the bot's identity, so a self-hoster's fork looks like their bot without editing any CSS.
 */
export interface BotIdentity {
	id: string;
	username: string;
	avatarUrl: string;
	/** Applications rarely have one, so every surface needs a fallback. */
	bannerUrl: string | null;
	/** The profile accent as a CSS hex, when the application has set one. */
	accentColour: string | null;
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
	/**
	 * Whether this person could add Testify. Discord requires Manage Server to invite a bot, so a server the
	 * owner console lists but the viewer cannot manage is neither configurable nor invitable — a third state the
	 * picker has to be able to say out loud rather than showing a button that would fail.
	 */
	canInvite: boolean;
}

/**
 * Everything Testify asks for on the invite, as one bitfield: view/send/embed/attach/history/react/emoji,
 * manage messages, roles, channels, nicknames and server, view audit log, and kick/ban/timeout/mute/deafen/move.
 * Asking for exactly what the features need beats asking for Administrator.
 */
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

/**
 * Told to an unauthenticated caller so a half-configured install shows instructions rather than a 500. It names
 * which variables are missing and never what any of them are set to.
 */
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
