import { isWaiting } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { PageHeader, SectionHeading, Skeleton } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { usePlaces } from "@/features/channels/usePlaces";
import { MissingPermissions } from "@/features/guild-overview/components/MissingPermissions";
import { RecentChanges } from "@/features/guild-overview/components/RecentChanges";
import { SetupChecklist } from "@/features/guild-overview/components/SetupChecklist";
import { WaitingChips } from "@/features/guild-overview/components/WaitingChips";
import { WhereItWorks } from "@/features/guild-overview/components/WhereItWorks";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";

const LINK = cn(INLINE_TARGET, "text-accent hover:text-foreground text-sm");

export function GuildOverviewPage(): React.JSX.Element {
	const { guildId = "" } = useParams();
	const { t } = useTranslation();
	const overview = useGuildOverview(guildId);
	const places = usePlaces(guildId);
	const channels = useChannels(guildId);

	usePageTitle(overview.data?.name ?? "Server");

	if (overview.isPending) return <OverviewSkeleton />;
	if (overview.isError) return <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />;

	const guild = overview.data;

	return (
		<>
			<PageHeader title={guild.name} subtitle={t("overview.subtitle")} />

			<MissingPermissions permissions={guild.missingPermissions} />

			<section aria-labelledby="works-heading" className="flex flex-col gap-3">
				<SectionHeading as="h2" id="works-heading">
					{t("overview.whereItWorks")}
				</SectionHeading>
				{places.isError || channels.isError ? (
					<ErrorState
						as="h2"
						error={places.error ?? channels.error}
						onRetry={() => {
							void places.refetch();
							void channels.refetch();
						}}
					/>
				) : places.data === undefined || channels.data === undefined ? (
					<Skeleton className="h-40" />
				) : (
					<>
						<WhereItWorks features={places.data.features} channels={channels.data} guildId={guildId} />
						<WaitingSection features={places.data.features} channels={channels.data} guildId={guildId} />
						<p className="text-muted-foreground text-sm">
							{t("overview.everywhereOn", {
								on: places.data.features.filter((f) => f.reach === "everywhere" && f.enabled).length,
								total: places.data.features.filter((f) => f.reach === "everywhere").length,
							})}{" "}
							<Link to={`/guilds/${guildId}/everywhere`} className={LINK}>
								{t("overview.everywhereLink")}
							</Link>
						</p>
					</>
				)}
			</section>

			<SetupChecklist guildId={guildId} />

			<section aria-labelledby="changes-heading" className="flex flex-col gap-3">
				<div className="flex flex-wrap items-baseline justify-between gap-2">
					<SectionHeading as="h2" id="changes-heading">
						{t("overview.recentChanges")}
					</SectionHeading>
					<Link to={`/guilds/${guildId}/changes`} className={LINK}>
						{t("overview.seeAllChanges")}
					</Link>
				</div>
				<RecentChanges changes={guild.recentChanges} />
			</section>
		</>
	);
}

function WaitingSection({
	features,
	channels,
	guildId,
}: React.ComponentProps<typeof WaitingChips>): React.JSX.Element | null {
	const { t } = useTranslation();
	const waiting = features.filter(isWaiting);
	if (waiting.length === 0) return null;

	return (
		<section aria-labelledby="waiting-heading" className="flex flex-col gap-3">
			<SectionHeading as="h3" id="waiting-heading" count={waiting.length}>
				{t("overview.waiting")}
			</SectionHeading>
			<p className="text-muted-foreground text-sm">{t("overview.waitingHint")}</p>
			<WaitingChips features={waiting} channels={channels} guildId={guildId} />
		</section>
	);
}

function OverviewSkeleton(): React.JSX.Element {
	return (
		<>
			<Skeleton className="h-8 w-56" />
			<Skeleton className="h-56 w-full" />
		</>
	);
}
