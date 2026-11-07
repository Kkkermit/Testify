import { List, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router";
import { PageHeader, type TabDefinition, TabBar, TabContent } from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { BoardsTab } from "@/features/members/components/BoardsTab";
import { DirectoryTab } from "@/features/members/components/DirectoryTab";
import { type MemberTab, tabFrom } from "@/features/members/directory.utils";
import { boardsOn } from "@/features/members/members.utils";
import { useFeaturesOff } from "@/features/site/useFeaturesOff";
import { usePageTitle } from "@/hooks/usePageTitle";

const TABS: readonly TabDefinition<MemberTab>[] = [
	{ key: "directory", label: "directory.tabDirectory", icon: List },
	{ key: "boards", label: "directory.tabBoards", icon: Trophy },
];

export function MembersPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const [params, setParams] = useSearchParams();
	const boards = boardsOn(useFeaturesOff());
	// With economy and levelling both switched off there is no board to show.
	const tabs = boards.length === 0 ? TABS.filter((entry) => entry.key !== "boards") : TABS;
	const tab = boards.length === 0 ? "directory" : tabFrom(params.get("tab"), params.get("board"));
	const overview = useGuildOverview(guildId);

	usePageTitle(t("members.title"), overview.data?.name);

	return (
		<>
			<PageHeader server={overview.data} title={t("members.title")} subtitle={t("members.subtitle")} />

			<TabBar
				label={t("directory.tabsLabel")}
				tabs={tabs}
				active={tab}
				onSelect={(next) => {
					// Each tab's own filters belong to it, so the address keeps only the tab.
					setParams(new URLSearchParams({ tab: next }));
				}}
			/>

			<TabContent label={t("directory.tabsLabel")} active={tab}>
				{tab === "directory" ? <DirectoryTab guildId={guildId} /> : <BoardsTab guildId={guildId} boards={boards} />}
			</TabContent>
		</>
	);
}
