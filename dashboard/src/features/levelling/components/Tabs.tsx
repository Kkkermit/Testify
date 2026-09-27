import { useTranslation } from "react-i18next";
import { TabBar } from "@/components/primitives";
import { TABS, type Tab } from "@/features/levelling/levelling.types";

export function Tabs({ active, onSelect }: { active: Tab; onSelect: (tab: Tab) => void }): React.JSX.Element {
	const { t } = useTranslation();
	return <TabBar label={t("levelling.tabsLabel")} tabs={TABS} active={active} onSelect={onSelect} />;
}
