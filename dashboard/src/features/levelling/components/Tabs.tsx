import { TabBar } from "@/components/primitives";
import { TABS, type Tab } from "@/features/levelling/levelling.types";

export function Tabs({ active, onSelect }: { active: Tab; onSelect: (tab: Tab) => void }): React.JSX.Element {
	return <TabBar label="Levelling settings" tabs={TABS} active={active} onSelect={onSelect} />;
}
