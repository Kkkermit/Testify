import { useQuery } from "@tanstack/react-query";
import { type GuildOverview } from "@testify/shared";
import { AlertTriangle, History } from "lucide-react";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { Badge, Card, EmptyState, PageHeader, Skeleton, StatTile } from "@/components/common/primitives";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";
import { usePageTitle } from "@/lib/usePageTitle";

export function GuildOverviewPage(): React.JSX.Element {
	const { guildId = "" } = useParams();
	const overview = useQuery({
		queryKey: keys.guild(guildId).overview(),
		queryFn: () => api.get<GuildOverview>(`/guilds/${guildId}/overview`),
		staleTime: 30_000,
	});

	usePageTitle(overview.data?.name ?? "Server");

	if (overview.isPending) return <OverviewSkeleton />;
	if (overview.isError) return <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />;

	const guild = overview.data;

	return (
		<>
			<PageHeader title={guild.name} subtitle="What Testify is doing in this server." />

			<section aria-label="Server at a glance" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
				<StatTile label="Members" value={guild.memberCount.toLocaleString()} />
				<StatTile label="Channels" value={guild.channelCount.toLocaleString()} />
				<StatTile label="Roles" value={guild.roleCount.toLocaleString()} />
				<StatTile label="Features on" value={String(guild.features.filter((feature) => feature.enabled).length)} />
			</section>

			{guild.missingPermissions.length > 0 && (
				<Card className="border-warning/40 mb-6">
					<h2 className="mb-2 flex items-center gap-2 font-semibold">
						<AlertTriangle className="text-warning" size={18} aria-hidden="true" />
						Testify is missing permissions
					</h2>
					<p className="text-muted-foreground mb-3 text-sm">
						These features are configured but will quietly do nothing until Testify is granted them.
					</p>
					<ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
						{guild.missingPermissions.map((permission) => (
							<li key={permission}>{permission}</li>
						))}
					</ul>
				</Card>
			)}

			<section aria-labelledby="features-heading" className="mb-6">
				<h2 id="features-heading" className="mb-3 text-lg font-semibold">
					Features
				</h2>
				<ul className="grid gap-3 sm:grid-cols-2">
					{guild.features.map((feature) => (
						<li key={feature.key}>
							<Card className="flex items-center justify-between gap-3 p-4">
								<span className="min-w-0">
									<span className="block font-medium">{feature.label}</span>
									<span className="text-muted-foreground block truncate text-xs">{feature.detail ?? "Not set up"}</span>
								</span>
								<Badge tone={feature.enabled ? "success" : "muted"}>{feature.enabled ? "On" : "Off"}</Badge>
							</Card>
						</li>
					))}
				</ul>
			</section>

			<section aria-labelledby="changes-heading">
				<h2 id="changes-heading" className="mb-3 text-lg font-semibold">
					Recent changes
				</h2>
				{guild.recentChanges.length === 0 ? (
					<Card>
						<EmptyState
							icon={<History size={28} />}
							title="Nothing changed here yet"
							body="Every change made from this dashboard is recorded, so you can see who turned what off and when."
						/>
					</Card>
				) : (
					<Card className="p-0">
						<ul className="divide-border divide-y">
							{guild.recentChanges.map((change) => (
								<li key={`${change.at}-${change.action}`} className="flex items-baseline gap-3 px-6 py-3 text-sm">
									<time dateTime={change.at} className="text-muted-foreground shrink-0 tabular-nums">
										{new Date(change.at).toLocaleString()}
									</time>
									<span className="min-w-0 flex-1">{change.summary}</span>
									<span className="text-muted-foreground shrink-0 text-xs">{change.actorTag}</span>
								</li>
							))}
						</ul>
					</Card>
				)}
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
