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

			<section aria-label="Server at a glance" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
				<StatTile label="Members" value={guild.memberCount} />
				<StatTile label="Channels" value={guild.channelCount} />
				<StatTile label="Roles" value={guild.roleCount} />
				<StatTile label="Features on" value={guild.features.filter((feature) => feature.enabled).length} />
			</section>

			<MissingPermissions permissions={guild.missingPermissions} />

			<section aria-labelledby="features-heading" className="mb-6">
				<h2 id="features-heading" className="mb-3 text-lg font-semibold">
					Features
				</h2>
				<FeatureGrid features={guild.features} />
			</section>

			<section aria-labelledby="changes-heading">
				<h2 id="changes-heading" className="mb-3 text-lg font-semibold">
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
			<div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
				{[0, 1, 2, 3].map((index) => (
					<Skeleton key={index} className="h-[86px]" />
				))}
			</div>
			<Skeleton className="mt-6 h-56 w-full" />
		</>
	);
}
