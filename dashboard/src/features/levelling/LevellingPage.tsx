import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { PageHeader, Skeleton, Summary, TabContent } from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { Tabs } from "@/features/levelling/components/Tabs";
import { levellingSummary, tabFrom } from "@/features/levelling/levelling.utils";
import { BoostsTab } from "@/features/levelling/tabs/BoostsTab";
import { GeneralTab } from "@/features/levelling/tabs/GeneralTab";
import { IgnoresTab } from "@/features/levelling/tabs/IgnoresTab";
import { RewardsTab } from "@/features/levelling/tabs/RewardsTab";
import { useChannels, useLevelling, useRoles } from "@/features/levelling/useLevelling";
import { usePageTitle } from "@/hooks/usePageTitle";
import { channelLabel } from "@/lib/channels";

export function LevellingPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const [params, setParams] = useSearchParams();
	const tab = tabFrom(params.get("tab"));

	const config = useLevelling(guildId);
	const channels = useChannels(guildId);
	const roles = useRoles(guildId);
	const overview = useGuildOverview(guildId);

	usePageTitle(t("levelling.title"), overview.data?.name);

	if (config.isPending) return <Skeleton className="h-96 w-full" />;
	if (config.isError) return <ErrorState error={config.error} onRetry={() => void config.refetch()} />;

	const shared = { guildId, channels: channels.data ?? [], roles: roles.data ?? [] };

	return (
		<>
			<PageHeader server={overview.data} title={t("levelling.title")} subtitle={t("levelling.subtitle")} />

			<Summary>
				{levellingSummary(config.data, channelLabel(shared.channels, config.data.levelUpChannelId, t), t)}
			</Summary>

			<Tabs
				active={tab}
				onSelect={(next) => {
					setParams({ tab: next });
				}}
			/>

			<TabContent label={t("levelling.tabsLabel")} active={tab}>
				{tab === "general" && <GeneralTab {...shared} config={config.data} />}
				{tab === "rewards" && <RewardsTab {...shared} rewards={config.data.rewards} />}
				{tab === "boosts" && <BoostsTab {...shared} boosts={config.data.boosts} />}
				{tab === "ignores" && (
					<IgnoresTab {...shared} channelIds={config.data.ignoredChannelIds} roleIds={config.data.ignoredRoleIds} />
				)}
			</TabContent>
		</>
	);
}
