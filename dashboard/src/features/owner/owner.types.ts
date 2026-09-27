import { Activity, Ban, Play, Power, ScrollText, Server, Terminal, Wrench } from "lucide-react";
import { type TabDefinition } from "@/components/primitives";

/** Adding a section of the console is an entry here and a branch in the page; the tab bar and `?tab=` follow. */
export const OWNER_TABS = [
	{ key: "overview", label: "owner.tabOverview", icon: Activity },
	{ key: "usage", label: "owner.tabUsage", icon: Server },
	{ key: "commands", label: "owner.tabCommands", icon: Terminal },
	{ key: "logs", label: "owner.tabLogs", icon: ScrollText },
	{ key: "run", label: "owner.tabRun", icon: Play },
	{ key: "blacklist", label: "owner.tabBlacklist", icon: Ban },
	{ key: "runtime", label: "owner.tabRuntime", icon: Wrench },
	{ key: "control", label: "owner.tabControl", icon: Power },
] as const satisfies readonly TabDefinition[];

type OwnerTab = (typeof OWNER_TABS)[number]["key"];

export function ownerTabFrom(raw: string | null): OwnerTab {
	const found = OWNER_TABS.find((tab) => tab.key === raw);
	return found?.key ?? "overview";
}
