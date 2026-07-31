import {
	Coins,
	Gift,
	Hash,
	LifeBuoy,
	MessageSquareWarning,
	Shield,
	Sparkles,
	TrendingUp,
	Users,
	type LucideIcon,
} from "lucide-react";

/**
 * How a bot feature is drawn wherever it appears. Adding a feature to the dashboard is an entry here plus
 * whatever the API starts returning — no screen needs editing, and an unknown key falls back rather than
 * rendering a hole.
 *
 * The tint classes are Tailwind utilities over the `--color-feature-*` tokens in `index.css`, so a rebrand is
 * still one file.
 */
export interface FeatureLook {
	icon: LucideIcon;
	/** Icon colour. */
	tint: string;
	/** The 15% fill behind the icon. */
	wash: string;
}

const LOOKS: Record<string, FeatureLook> = {
	levelling: { icon: TrendingUp, tint: "text-feature-levelling", wash: "bg-feature-levelling/15" },
	economy: { icon: Coins, tint: "text-feature-economy", wash: "bg-feature-economy/15" },
	moderation: { icon: Shield, tint: "text-feature-moderation", wash: "bg-feature-moderation/15" },
	automod: { icon: MessageSquareWarning, tint: "text-feature-moderation", wash: "bg-feature-moderation/15" },
	welcome: { icon: Users, tint: "text-feature-welcome", wash: "bg-feature-welcome/15" },
	tickets: { icon: LifeBuoy, tint: "text-feature-tickets", wash: "bg-feature-tickets/15" },
	giveaway: { icon: Gift, tint: "text-feature-community", wash: "bg-feature-community/15" },
	counting: { icon: Hash, tint: "text-feature-community", wash: "bg-feature-community/15" },
};

const FALLBACK: FeatureLook = { icon: Sparkles, tint: "text-muted-foreground", wash: "bg-muted" };

export function featureLook(key: string): FeatureLook {
	return LOOKS[key] ?? FALLBACK;
}
