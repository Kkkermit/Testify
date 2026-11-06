import { type GuildOverview } from "@testify/shared";
import { Hash, Shield, Sparkles, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { DividedList, HoverChevron, SectionHeading, PageHeader, Skeleton, StatTile } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { allNavItems, navigationFor } from "@/config/navigation";
import { permissionLabel } from "@/features/commands/permissions.labels";
import { FeatureGrid } from "@/features/guild-overview/components/FeatureGrid";
import { InboxLine } from "@/features/guild-overview/components/InboxLine";
import { MissingPermissions } from "@/features/guild-overview/components/MissingPermissions";
import { RecentChanges } from "@/features/guild-overview/components/RecentChanges";
import { SetupChecklist } from "@/features/guild-overview/components/SetupChecklist";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { accessFrom } from "@/features/guild-overview/useLacks";
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
	if (accessFrom(guild) === "moderate") return <ModeratorOverview guild={guild} />;

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

const ROW = "hover:bg-muted/60 group flex items-center gap-3 px-4 py-3 transition-colors duration-150";

/** Somebody who can moderate but not manage gets the server's figures and the way into each tool they may use. */
function ModeratorOverview({ guild }: { guild: GuildOverview }): React.JSX.Element {
	const { t } = useTranslation();
	const screens = allNavItems(navigationFor({ guild: { ...guild, access: "moderate" }, isOwner: false })).filter(
		(item) => item.to.startsWith(`/guilds/${guild.id}/`),
	);

	return (
		<>
			<PageHeader title={guild.name} subtitle={t("overview.moderatorSubtitle")} />

			<section aria-label={t("overview.glance")} className="grid gap-4 sm:grid-cols-3">
				<StatTile label={t("overview.members")} value={guild.memberCount} icon={Users} tint="text-hue-green" />
				<StatTile label={t("overview.channels")} value={guild.channelCount} icon={Hash} tint="text-hue-blue" />
				<StatTile label={t("overview.roles")} value={guild.roleCount} icon={Shield} tint="text-hue-violet" />
			</section>

			<MissingPermissions permissions={guild.missingPermissions} />

			<section aria-labelledby="moderation-heading" className="flex flex-col gap-3">
				<SectionHeading as="h2" id="moderation-heading">
					{t("overview.moderatorScreens")}
				</SectionHeading>
				<DividedList className="bg-card">
					{screens.map(({ to, labelKey, hintKey, icon: Icon }) => (
						<li key={to}>
							<Link to={to} className={ROW}>
								<Icon size={18} aria-hidden="true" className="text-hue-red shrink-0" />
								<span className="min-w-0 flex-1">
									<span className="block font-medium">{t(labelKey)}</span>
									{hintKey !== undefined && <span className="text-muted-foreground block text-sm">{t(hintKey)}</span>}
								</span>
								<HoverChevron />
							</Link>
						</li>
					))}
				</DividedList>
				<p className="text-muted-foreground text-sm">
					{t("overview.moderatorSettings", { permission: permissionLabel("ManageGuild", t) })}
				</p>
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
