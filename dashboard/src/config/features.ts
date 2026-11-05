import {
	AudioLines,
	Cake,
	CalendarClock,
	Code2,
	Coins,
	Dices,
	Gauge,
	Gavel,
	Gift,
	Hash,
	Info,
	LifeBuoy,
	Lightbulb,
	Link as LinkIcon,
	ListChecks,
	MessageSquareReply,
	MessageSquareWarning,
	MessagesSquare,
	Music,
	Ticket,
	ScrollText,
	Settings,
	Shield,
	ShieldCheck,
	Siren,
	Smile,
	Sparkles,
	Star,
	TrendingUp,
	Volume2,
	Pin,
	UserMinus,
	UserPlus,
	Users,
	type LucideIcon,
} from "lucide-react";

/** An unknown key falls back rather than rendering a hole, so the API can ship a feature before this knows about it. */
interface FeatureLook {
	icon: LucideIcon;
	/** The settings screen for it, where the dashboard has one. Absent while a feature is Discord-only. */
	path?: (guildId: string) => string;
}

const LOOKS: Record<string, FeatureLook> = {
	"bot-stats": {
		icon: Gauge,
		path: (guildId) => `/guilds/${guildId}/bot-stats`,
	},
	ideas: {
		icon: Lightbulb,
		path: (guildId) => `/guilds/${guildId}/ideas`,
	},
	"role-menus": {
		icon: ListChecks,
		path: (guildId) => `/guilds/${guildId}/role-menus`,
	},
	sticky: {
		icon: Pin,
		path: (guildId) => `/guilds/${guildId}/sticky`,
	},
	"auto-responders": {
		icon: MessageSquareReply,
		path: (guildId) => `/guilds/${guildId}/auto-responders`,
	},
	"scheduled-messages": {
		icon: CalendarClock,
		path: (guildId) => `/guilds/${guildId}/scheduled-messages`,
	},
	starboard: {
		icon: Star,
		path: (guildId) => `/guilds/${guildId}/starboard`,
	},
	"temp-voice": {
		icon: Volume2,
		path: (guildId) => `/guilds/${guildId}/temp-voice`,
	},
	levelling: {
		icon: TrendingUp,
		path: (guildId) => `/guilds/${guildId}/levelling`,
	},
	"audit-logging": {
		icon: ScrollText,
		path: (guildId) => `/guilds/${guildId}/audit-log`,
	},
	economy: { icon: Coins },
	lottery: {
		icon: Ticket,
		path: (guildId) => `/guilds/${guildId}/lottery`,
	},
	treasure: {
		icon: Coins,
		path: (guildId) => `/guilds/${guildId}/treasure`,
	},
	casino: {
		icon: Dices,
		path: (guildId) => `/guilds/${guildId}/casino`,
	},
	music: {
		icon: Music,
		path: (guildId) => `/guilds/${guildId}/music`,
	},
	"anti-link": {
		icon: LinkIcon,
		path: (guildId) => `/guilds/${guildId}/settings`,
	},
	"auto-roles": {
		icon: UserPlus,
		path: (guildId) => `/guilds/${guildId}/settings`,
	},
	"voice-stats": {
		icon: AudioLines,
		path: (guildId) => `/guilds/${guildId}/settings`,
	},
	verification: {
		icon: ShieldCheck,
		path: (guildId) => `/guilds/${guildId}/settings`,
	},
	cases: {
		icon: Gavel,
		path: (guildId) => `/guilds/${guildId}/cases`,
	},
	"raid-protection": {
		icon: Siren,
		path: (guildId) => `/guilds/${guildId}/raid-protection`,
	},
	moderation: { icon: Shield },
	automod: {
		icon: MessageSquareWarning,
		path: (guildId) => `/guilds/${guildId}/automod`,
	},
	welcome: {
		icon: Users,
		path: (guildId) => `/guilds/${guildId}/welcome`,
	},
	birthdays: {
		icon: Cake,
		path: (guildId) => `/guilds/${guildId}/birthdays`,
	},
	goodbye: {
		icon: UserMinus,
		path: (guildId) => `/guilds/${guildId}/welcome`,
	},
	tickets: {
		icon: LifeBuoy,
		path: (guildId) => `/guilds/${guildId}/tickets`,
	},
	giveaway: {
		icon: Gift,
		path: (guildId) => `/guilds/${guildId}/giveaways`,
	},
	counting: {
		icon: Hash,
		path: (guildId) => `/guilds/${guildId}/settings`,
	},
	community: { icon: MessagesSquare },
	fun: { icon: Smile },
	games: { icon: Dices },
	info: { icon: Info },
	settings: { icon: Settings },
	developer: { icon: Code2 },
	owner: { icon: ShieldCheck },
};

const FALLBACK: FeatureLook = { icon: Sparkles };

export function featureLook(key: string): FeatureLook {
	return LOOKS[key] ?? FALLBACK;
}
