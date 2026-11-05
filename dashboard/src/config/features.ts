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

interface FeatureLook {
	icon: LucideIcon;
	tint: string;
	path?: (guildId: string) => string;
}

/** Each hue is a part of the bot, grouped as the sidebar groups it. */
const LOOKS: Record<string, FeatureLook> = {
	"bot-stats": {
		icon: Gauge,
		tint: "text-hue-blue",
		path: (guildId) => `/guilds/${guildId}/bot-stats`,
	},
	ideas: {
		icon: Lightbulb,
		tint: "text-hue-green",
		path: (guildId) => `/guilds/${guildId}/ideas`,
	},
	"role-menus": {
		icon: ListChecks,
		tint: "text-hue-green",
		path: (guildId) => `/guilds/${guildId}/role-menus`,
	},
	sticky: {
		icon: Pin,
		tint: "text-hue-blue",
		path: (guildId) => `/guilds/${guildId}/sticky`,
	},
	"auto-responders": {
		icon: MessageSquareReply,
		tint: "text-hue-blue",
		path: (guildId) => `/guilds/${guildId}/auto-responders`,
	},
	"scheduled-messages": {
		icon: CalendarClock,
		tint: "text-hue-blue",
		path: (guildId) => `/guilds/${guildId}/scheduled-messages`,
	},
	starboard: {
		icon: Star,
		tint: "text-hue-green",
		path: (guildId) => `/guilds/${guildId}/starboard`,
	},
	"temp-voice": {
		icon: Volume2,
		tint: "text-hue-green",
		path: (guildId) => `/guilds/${guildId}/temp-voice`,
	},
	levelling: {
		icon: TrendingUp,
		tint: "text-hue-green",
		path: (guildId) => `/guilds/${guildId}/levelling`,
	},
	"audit-logging": {
		icon: ScrollText,
		tint: "text-hue-red",
		path: (guildId) => `/guilds/${guildId}/audit-log`,
	},
	economy: { icon: Coins, tint: "text-hue-amber" },
	lottery: {
		icon: Ticket,
		tint: "text-hue-amber",
		path: (guildId) => `/guilds/${guildId}/lottery`,
	},
	treasure: {
		icon: Coins,
		tint: "text-hue-amber",
		path: (guildId) => `/guilds/${guildId}/treasure`,
	},
	casino: {
		icon: Dices,
		tint: "text-hue-amber",
		path: (guildId) => `/guilds/${guildId}/casino`,
	},
	music: {
		icon: Music,
		tint: "text-hue-pink",
		path: (guildId) => `/guilds/${guildId}/music`,
	},
	"anti-link": {
		icon: LinkIcon,
		tint: "text-hue-red",
		path: (guildId) => `/guilds/${guildId}/settings`,
	},
	"auto-roles": {
		icon: UserPlus,
		tint: "text-hue-green",
		path: (guildId) => `/guilds/${guildId}/settings`,
	},
	"voice-stats": {
		icon: AudioLines,
		tint: "text-hue-blue",
		path: (guildId) => `/guilds/${guildId}/settings`,
	},
	verification: {
		icon: ShieldCheck,
		tint: "text-hue-red",
		path: (guildId) => `/guilds/${guildId}/settings`,
	},
	cases: {
		icon: Gavel,
		tint: "text-hue-red",
		path: (guildId) => `/guilds/${guildId}/cases`,
	},
	"raid-protection": {
		icon: Siren,
		tint: "text-hue-red",
		path: (guildId) => `/guilds/${guildId}/raid-protection`,
	},
	moderation: { icon: Shield, tint: "text-hue-red" },
	automod: {
		icon: MessageSquareWarning,
		tint: "text-hue-red",
		path: (guildId) => `/guilds/${guildId}/automod`,
	},
	welcome: {
		icon: Users,
		tint: "text-hue-green",
		path: (guildId) => `/guilds/${guildId}/welcome`,
	},
	birthdays: {
		icon: Cake,
		tint: "text-hue-green",
		path: (guildId) => `/guilds/${guildId}/birthdays`,
	},
	goodbye: {
		icon: UserMinus,
		tint: "text-hue-green",
		path: (guildId) => `/guilds/${guildId}/welcome`,
	},
	tickets: {
		icon: LifeBuoy,
		tint: "text-hue-red",
		path: (guildId) => `/guilds/${guildId}/tickets`,
	},
	giveaway: {
		icon: Gift,
		tint: "text-hue-pink",
		path: (guildId) => `/guilds/${guildId}/giveaways`,
	},
	counting: {
		icon: Hash,
		tint: "text-hue-green",
		path: (guildId) => `/guilds/${guildId}/settings`,
	},
	community: { icon: MessagesSquare, tint: "text-hue-green" },
	fun: { icon: Smile, tint: "text-hue-violet" },
	games: { icon: Dices, tint: "text-hue-violet" },
	info: { icon: Info, tint: "text-hue-blue" },
	settings: { icon: Settings, tint: "text-muted-foreground" },
	developer: { icon: Code2, tint: "text-muted-foreground" },
	owner: { icon: ShieldCheck, tint: "text-hue-red" },
};

const FALLBACK: FeatureLook = { icon: Sparkles, tint: "text-muted-foreground" };

export function featureLook(key: string): FeatureLook {
	return LOOKS[key] ?? FALLBACK;
}
