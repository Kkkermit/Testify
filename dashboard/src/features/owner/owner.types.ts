import { Activity, Power, ScrollText, Server, Terminal, Wrench } from "lucide-react";
import { type TabDefinition } from "@/components/primitives";

/** Adding a section of the console is an entry here and a branch in the page; the tab bar and `?tab=` follow. */
export const OWNER_TABS = [
	{ key: "overview", label: "Overview", icon: Activity },
	{ key: "usage", label: "Usage", icon: Server },
	{ key: "commands", label: "Commands", icon: Terminal },
	{ key: "logs", label: "Logs", icon: ScrollText },
	{ key: "runtime", label: "Runtime", icon: Wrench },
	{ key: "control", label: "Control", icon: Power },
] as const satisfies readonly TabDefinition[];

export type OwnerTab = (typeof OWNER_TABS)[number]["key"];

export function ownerTabFrom(raw: string | null): OwnerTab {
	const found = OWNER_TABS.find((tab) => tab.key === raw);
	return found?.key ?? "overview";
}
