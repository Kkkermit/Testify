import { Hash, Shield, Sparkles, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { SectionHeading, PageHeader, Skeleton, StatTile } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { FeatureGrid } from "@/features/guild-overview/components/FeatureGrid";
import { InboxLine } from "@/features/guild-overview/components/InboxLine";
import { MissingPermissions } from "@/features/guild-overview/components/MissingPermissions";
import { RecentChanges } from "@/features/guild-overview/components/RecentChanges";
import { SetupChecklist } from "@/features/guild-overview/components/SetupChecklist";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";

export function GuildOverviewPage(): React.JSX.Element {
	const { guildId = "" } = useParams();
	const { t } = useTranslation();
	const overview = useGuildOverview(guildId);

	usePageTitle(overview.data?.name ?? t("owner.server"));

	if (overview.isPending) return <OverviewSkeleton />;
	if (overview.isError) return <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />;

	const guild = overview.data;

	return (
		<>
			<PageHeader title={guild.name} subtitle={t("overview.subtitle")} />
			<InboxLine guildId={guildId} />

			<section aria-label={t("overview.glance")} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<StatTile label={t("overview.members")} value={guild.memberCount} icon={Users} tint="text-hue-green" />
				<StatTile label={t("overview.channels")} value={guild.channelCount} icon={Hash} tint="text-hue-blue" />
				<StatTile label={t("overview.roles")} value={guild.roleCount} icon={Shield} tint="text-hue-violet" />
				<StatTile
					label={t("overview.featuresOn")}
					value={guild.features.filter((feature) => feature.enabled).length}
					icon={Sparkles}
					tint="text-hue-amber"
					hint={t("overview.featuresHint")}
				/>
			</section>

			<MissingPermissions permissions={guild.missingPermissions} />
			<SetupChecklist guildId={guildId} />

			<section aria-labelledby="features-heading" className="flex flex-col gap-3">
				<SectionHeading as="h2" id="features-heading">
					{t("overview.features")}
				</SectionHeading>
				<FeatureGrid features={guild.features} guildId={guildId} />
			</section>

			<section aria-labelledby="changes-heading" className="flex flex-col gap-3">
				<div className="flex flex-wrap items-baseline justify-between gap-2">
					<SectionHeading as="h2" id="changes-heading">
						{t("overview.recentChanges")}
					</SectionHeading>
					<Link
						to={`/guilds/${guildId}/changes`}
						className={cn(INLINE_TARGET, "text-accent hover:text-foreground text-sm")}
					>
						{t("overview.seeAllChanges")}
					</Link>
				</div>
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
