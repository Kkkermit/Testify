import { averagePerDay, INSIGHT_WINDOWS, type InsightWindow } from "@testify/shared";
import { MessageSquare, UserMinus, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import {
	Avatar,
	Card,
	CARD_HEADING,
	Eyebrow,
	PageHeader,
	SegmentedControl,
	Skeleton,
	StatTile,
} from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { ActivityChart } from "@/features/insights/components/ActivityChart";
import { HoursChart } from "@/features/insights/components/HoursChart";
import { MoveList } from "@/features/insights/components/MoveList";
import { ServerFactsCard } from "@/features/insights/components/ServerFactsCard";
import { INSIGHT_WINDOW_LABELS } from "@/features/insights/insights.utils";
import { useInsights } from "@/features/insights/useInsights";
import { UsageBars } from "@/features/owner/components/UsageBars";
import { usePageTitle } from "@/hooks/usePageTitle";
import { shortDate } from "@/lib/datetime";

export function InsightsPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const overview = useGuildOverview(guildId);
	const [days, setDays] = useState<InsightWindow>(7);
	const insights = useInsights(guildId, days);

	usePageTitle(t("insights.title"), overview.data?.name);

	const header = (
		<PageHeader eyebrow={overview.data?.name} title={t("insights.title")} subtitle={t("insights.subtitle")} />
	);
	if (insights.isError) {
		return (
			<>
				{header}
				<ErrorState as="h2" error={insights.error} onRetry={() => void insights.refetch()} />
			</>
		);
	}
	if (insights.isPending) {
		return (
			<>
				{header}
				<Skeleton className="h-96 w-full" />
			</>
		);
	}

	const report = insights.data;

	return (
		<>
			{header}

			<section aria-labelledby="insights-server" className="flex flex-col gap-3">
				<Eyebrow as="h2" id="insights-server">
					{t("insights.serverTitle")}
				</Eyebrow>
				<ServerFactsCard server={report.server} />
			</section>

			<section aria-labelledby="insights-activity" className="flex flex-col gap-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<Eyebrow as="h2" id="insights-activity">
						{t("insights.activityTitle")}
					</Eyebrow>
					<SegmentedControl
						label={t("insights.windowLabel")}
						segments={INSIGHT_WINDOWS.map((value) => ({ value, label: t(INSIGHT_WINDOW_LABELS[value]) }))}
						value={days}
						onChange={setDays}
					/>
				</div>
				<p className="text-muted-foreground text-sm">
					{report.countingSince === null
						? t("insights.notCountingYet")
						: t("insights.countingSince", { date: shortDate(report.countingSince) })}
				</p>

				<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
					<StatTile label={t("insights.messages")} value={report.totals.messages} icon={MessageSquare} />
					<StatTile label={t("insights.activeMembers")} value={report.totals.activeMembers} icon={Users} />
					<StatTile label={t("insights.joined")} value={report.totals.joins} icon={UserPlus} />
					<StatTile label={t("insights.left")} value={report.totals.leaves} icon={UserMinus} />
				</div>

				<Card className="flex flex-col gap-4">
					<div>
						<h3 className={CARD_HEADING}>{t("insights.messagesPerDay")}</h3>
						<p className="text-muted-foreground text-sm">
							{t("insights.average", { average: averagePerDay(report.totals.messages, report.days) })}
						</p>
					</div>
					<ActivityChart days={report.daily} />
				</Card>

				<Card className="flex flex-col gap-4">
					<h3 className={CARD_HEADING}>{t("insights.hoursTitle")}</h3>
					<HoursChart hours={report.hours} />
				</Card>

				<div className="grid items-start gap-4 lg:grid-cols-2">
					<Card className="flex flex-col gap-3">
						<h3 className={CARD_HEADING}>{t("insights.topChannels")}</h3>
						<UsageBars
							empty={t("insights.noMessages")}
							rows={report.topChannels.map((channel) => ({
								id: channel.channelId,
								label: channel.name === null ? t("insights.deletedChannel") : `#${channel.name}`,
								count: channel.messages,
							}))}
						/>
					</Card>
					<Card className="flex flex-col gap-3">
						<h3 className={CARD_HEADING}>{t("insights.topMembers")}</h3>
						<UsageBars
							empty={t("insights.noMessages")}
							rows={report.topMembers.map((member) => ({
								id: member.userId,
								label: (
									<Link
										to={`/guilds/${guildId}/members/${member.userId}`}
										className="hover:text-accent flex items-center gap-2"
									>
										<Avatar name={member.name} url={member.avatarUrl} size={20} seed={member.userId} />
										<span className="truncate">{member.name}</span>
									</Link>
								),
								count: member.messages,
							}))}
						/>
					</Card>
				</div>
			</section>

			<section aria-labelledby="insights-moves" className="flex flex-col gap-3">
				<Eyebrow as="h2" id="insights-moves">
					{t("insights.movesTitle")}
				</Eyebrow>
				<div className="grid items-start gap-4 lg:grid-cols-2">
					<Card className="flex flex-col gap-3">
						<h3 className={CARD_HEADING}>{t("insights.recentJoins")}</h3>
						<MoveList guildId={guildId} moves={report.recentJoins} empty={t("insights.noJoins")} />
					</Card>
					<Card className="flex flex-col gap-3">
						<h3 className={CARD_HEADING}>{t("insights.recentLeaves")}</h3>
						<MoveList guildId={guildId} moves={report.recentLeaves} empty={t("insights.noLeaves")} />
					</Card>
				</div>
			</section>
		</>
	);
}
