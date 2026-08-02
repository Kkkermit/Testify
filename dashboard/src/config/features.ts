import {
	AudioLines,
	Code2,
	Coins,
	Dices,
	Gift,
	Hash,
	Info,
	LifeBuoy,
	Link as LinkIcon,
	MessageSquareWarning,
	MessagesSquare,
	ScrollText,
	Settings,
	Shield,
	ShieldCheck,
	Smile,
	Sparkles,
	TrendingUp,
	UserPlus,
	Users,
	type LucideIcon,
} from "lucide-react";

/**
 * How a bot feature is drawn wherever it appears. The overview grid keys it by feature and the command list by
 * category, and the two overlap enough to share one map; an unknown key falls back rather than rendering a hole,
 * so the API can ship a feature before this knows about it. Tints are utilities over the `--color-feature-*`
 * tokens, so a rebrand stays one file.
 */
export interface FeatureLook {
	icon: LucideIcon;
	/** Icon colour. */
	tint: string;
	/** The 15% fill behind the icon. */
	wash: string;
	/** The settings screen for it, where the dashboard has one. Absent while a feature is Discord-only. */
	path?: (guildId: string) => string;
}

const LOOKS: Record<string, FeatureLook> = {
	levelling: {
		icon: TrendingUp,
		tint: "text-feature-levelling",
		wash: "bg-feature-levelling/15",
		path: (guildId) => `/guilds/${guildId}/levelling`,
	},
	"audit-logging": {
		icon: ScrollText,
		tint: "text-feature-tickets",
		wash: "bg-feature-tickets/15",
		path: (guildId) => `/guilds/${guildId}/audit-log`,
	},
	economy: { icon: Coins, tint: "text-feature-economy", wash: "bg-feature-economy/15" },
	"anti-link": {
		icon: LinkIcon,
		tint: "text-feature-moderation",
		wash: "bg-feature-moderation/15",
		path: (guildId) => `/guilds/${guildId}/settings`,
	},
	"auto-roles": {
		icon: UserPlus,
		tint: "text-feature-welcome",
		wash: "bg-feature-welcome/15",
		path: (guildId) => `/guilds/${guildId}/settings`,
	},
	"voice-stats": {
		icon: AudioLines,
		tint: "text-feature-tickets",
		wash: "bg-feature-tickets/15",
		path: (guildId) => `/guilds/${guildId}/settings`,
	},
	verification: {
		icon: ShieldCheck,
		tint: "text-feature-moderation",
		wash: "bg-feature-moderation/15",
		path: (guildId) => `/guilds/${guildId}/settings`,
	},
	moderation: { icon: Shield, tint: "text-feature-moderation", wash: "bg-feature-moderation/15" },
	automod: { icon: MessageSquareWarning, tint: "text-feature-moderation", wash: "bg-feature-moderation/15" },
	welcome: {
		icon: Users,
		tint: "text-feature-welcome",
		wash: "bg-feature-welcome/15",
		path: (guildId) => `/guilds/${guildId}/welcome`,
	},
	tickets: { icon: LifeBuoy, tint: "text-feature-tickets", wash: "bg-feature-tickets/15" },
	giveaway: { icon: Gift, tint: "text-feature-community", wash: "bg-feature-community/15" },
	counting: {
		icon: Hash,
		tint: "text-feature-community",
		wash: "bg-feature-community/15",
		path: (guildId) => `/guilds/${guildId}/settings`,
	},
	community: { icon: MessagesSquare, tint: "text-feature-community", wash: "bg-feature-community/15" },
	fun: { icon: Smile, tint: "text-feature-community", wash: "bg-feature-community/15" },
	games: { icon: Dices, tint: "text-feature-economy", wash: "bg-feature-economy/15" },
	info: { icon: Info, tint: "text-feature-tickets", wash: "bg-feature-tickets/15" },
	settings: { icon: Settings, tint: "text-muted-foreground", wash: "bg-muted" },
	developer: { icon: Code2, tint: "text-muted-foreground", wash: "bg-muted" },
	owner: { icon: ShieldCheck, tint: "text-feature-moderation", wash: "bg-feature-moderation/15" },
};

const FALLBACK: FeatureLook = { icon: Sparkles, tint: "text-muted-foreground", wash: "bg-muted" };

export function featureLook(key: string): FeatureLook {
	return LOOKS[key] ?? FALLBACK;
}
