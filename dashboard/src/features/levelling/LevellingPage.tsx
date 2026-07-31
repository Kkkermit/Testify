import { useParams, useSearchParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { PageHeader, Skeleton } from "@/components/primitives";
import { Tabs } from "@/features/levelling/components/Tabs";
import { tabFrom } from "@/features/levelling/levelling.utils";
import { BoostsTab } from "@/features/levelling/tabs/BoostsTab";
import { GeneralTab } from "@/features/levelling/tabs/GeneralTab";
import { IgnoresTab } from "@/features/levelling/tabs/IgnoresTab";
import { RewardsTab } from "@/features/levelling/tabs/RewardsTab";
import { useChannels, useLevelling, useRoles } from "@/features/levelling/useLevelling";
import { usePageTitle } from "@/hooks/usePageTitle";

export function LevellingPage(): React.JSX.Element {
	usePageTitle("Levelling");
	const { guildId = "" } = useParams();
	// In the URL, so a link to the rewards tab is a link to the rewards tab and Back works.
	const [params, setParams] = useSearchParams();
	const tab = tabFrom(params.get("tab"));

	const config = useLevelling(guildId);
	const channels = useChannels(guildId);
	const roles = useRoles(guildId);

	if (config.isPending) return <Skeleton className="h-96 w-full" />;
	if (config.isError) return <ErrorState error={config.error} onRetry={() => void config.refetch()} />;

	const shared = { guildId, channels: channels.data ?? [], roles: roles.data ?? [] };

	return (
		<>
			<PageHeader title="Levelling" subtitle="Who earns XP, what they get for it, and where it is announced." />

			<Tabs
				active={tab}
				onSelect={(next) => {
					setParams({ tab: next });
				}}
			/>

			{tab === "general" && <GeneralTab {...shared} config={config.data} />}
			{tab === "rewards" && <RewardsTab {...shared} rewards={config.data.rewards} />}
			{tab === "boosts" && <BoostsTab {...shared} boosts={config.data.boosts} />}
			{tab === "ignores" && (
				<IgnoresTab {...shared} channelIds={config.data.ignoredChannelIds} roleIds={config.data.ignoredRoleIds} />
			)}
		</>
	);
}
