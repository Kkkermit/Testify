import { Bot, CalendarDays, UserRound, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { Card, CARD_HEADING, PageHeader, Skeleton, StatTile } from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { splitOf } from "@/features/member-count/memberCount.utils";
import { useMemberCount } from "@/features/member-count/useMemberCount";
import { usePageTitle } from "@/hooks/usePageTitle";

export function MemberCountPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();

	const count = useMemberCount(guildId);
	const overview = useGuildOverview(guildId);

	usePageTitle(t("memberCount.title"), overview.data?.name);

	if (count.isError) return <ErrorState error={count.error} onRetry={() => void count.refetch()} />;
	if (count.isPending) return <Skeleton className="h-96 w-full" />;

	const counts = count.data;
	const split = splitOf(counts);

	return (
		<>
			<PageHeader eyebrow={overview.data?.name} title={t("memberCount.title")} subtitle={t("memberCount.subtitle")} />

			<section aria-label={t("memberCount.breakdown")} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<StatTile label={t("memberCount.total")} value={counts.total} icon={Users} tint="text-feature-welcome" />
				<StatTile
					label={t("memberCount.people")}
					value={counts.people}
					icon={UserRound}
					tint="text-feature-levelling"
				/>
				<StatTile label={t("memberCount.bots")} value={counts.bots} icon={Bot} tint="text-feature-tickets" />
				<StatTile
					label={t("memberCount.joinedWeek")}
					value={counts.joinedWeek}
					icon={CalendarDays}
					tint="text-feature-economy"
				/>
			</section>

			<Card className="flex flex-col gap-3">
				<h2 className={CARD_HEADING}>{t("memberCount.splitTitle")}</h2>
				<div aria-hidden="true" className="bg-muted flex h-2 overflow-hidden rounded-full">
					<span className="bg-primary block h-full" style={{ width: `${String(split.people)}%` }} />
				</div>
				<p className="text-sm tabular-nums">{t("memberCount.split", { people: split.people, bots: split.bots })}</p>
				<p className="text-sm tabular-nums">{t("memberCount.joinedDay", { count: counts.joinedDay })}</p>
				<p className="text-muted-foreground text-sm">{t("memberCount.note")}</p>
			</Card>
		</>
	);
}
