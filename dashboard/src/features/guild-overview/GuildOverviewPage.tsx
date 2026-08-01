import { Hash, Shield, Sparkles, Users } from "lucide-react";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { PageHeader, Skeleton, StatTile } from "@/components/primitives";
import { FeatureGrid } from "@/features/guild-overview/components/FeatureGrid";
import { MissingPermissions } from "@/features/guild-overview/components/MissingPermissions";
import { RecentChanges } from "@/features/guild-overview/components/RecentChanges";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { usePageTitle } from "@/hooks/usePageTitle";

export function GuildOverviewPage(): React.JSX.Element {
	const { guildId = "" } = useParams();
	const overview = useGuildOverview(guildId);

	usePageTitle(overview.data?.name ?? "Server");

	if (overview.isPending) return <OverviewSkeleton />;
	if (overview.isError) return <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />;

	const guild = overview.data;

	return (
		<>
			<PageHeader title={guild.name} subtitle="What Testify is doing in this server." />

			<section aria-label="Server at a glance" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<StatTile label="Members" value={guild.memberCount} icon={Users} tint="text-feature-welcome" />
				<StatTile label="Channels" value={guild.channelCount} icon={Hash} tint="text-feature-tickets" />
				<StatTile label="Roles" value={guild.roleCount} icon={Shield} tint="text-feature-levelling" />
				<StatTile
					label="Features on"
					value={guild.features.filter((feature) => feature.enabled).length}
					icon={Sparkles}
					tint="text-feature-economy"
					hint="Features Testify is actively running here, out of everything it offers."
				/>
			</section>

			<MissingPermissions permissions={guild.missingPermissions} />

			<section aria-labelledby="features-heading" className="flex flex-col gap-3">
				<h2 id="features-heading" className="text-lg font-semibold">
					Features
				</h2>
				<FeatureGrid features={guild.features} guildId={guildId} />
			</section>

			<section aria-labelledby="changes-heading" className="flex flex-col gap-3">
				<h2 id="changes-heading" className="text-lg font-semibold">
					Recent changes
				</h2>
				<RecentChanges changes={guild.recentChanges} />
			</section>
		</>
	);
}

function OverviewSkeleton(): React.JSX.Element {
	return (
		<>
			<Skeleton className="h-8 w-56" />
			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				{[0, 1, 2, 3].map((index) => (
					<Skeleton key={index} className="h-[86px]" />
				))}
			</div>
			<Skeleton className="h-56 w-full" />
		</>
	);
}
