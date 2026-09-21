import { type LucideIcon } from "lucide-react";
import { allNavItems, navigationFor, type NavGroup } from "@/config/navigation";
import { type TranslationKey } from "@/i18n";

/** One area of the dashboard, as the tour describes it. */
export interface HelpArea {
	labelKey: TranslationKey;
	hintKey: TranslationKey | undefined;
	icon: LucideIcon;
}

/**
 * The tour reads the sidebar's own registry, so a screen added there is explained here with no second edit.
 *
 * `navigationFor` builds guild-scoped paths, and the tour has no server in scope — the rows describe rather
 * than link, and the id below is never read.
 */
const UNUSED_GUILD = { id: "0", name: "" };

export function helpAreas(isOwner: boolean): HelpArea[] {
	const groups: NavGroup[] = navigationFor({ guild: UNUSED_GUILD, isOwner });

	return allNavItems(groups).map((item) => ({
		labelKey: item.labelKey,
		hintKey: item.hintKey,
		icon: item.icon,
	}));
}
