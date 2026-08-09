import { TabBar } from "@/components/primitives";
import { TABS, type Tab } from "@/features/levelling/levelling.types";

export const TABS_LABEL = "Levelling settings";

export function Tabs({ active, onSelect }: { active: Tab; onSelect: (tab: Tab) => void }): React.JSX.Element {
	return <TabBar label={TABS_LABEL} tabs={TABS} active={active} onSelect={onSelect} />;
}
