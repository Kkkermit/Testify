import { type WeekEvent } from "@testify/shared";
import { CalendarClock, CalendarDays, Cake, Gift, type LucideIcon, Ticket } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import {
	Card,
	DividedList,
	EmptyState,
	HoverChevron,
	PageHeader,
	SectionHeading,
	Skeleton,
	Summary,
} from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { useWeek } from "@/features/week/useWeek";
import { EVENT_PATHS, eventDetail, eventTitle, groupByDay, weekSummary } from "@/features/week/week.utils";
import { usePageTitle } from "@/hooks/usePageTitle";
import { timeOfDay } from "@/lib/datetime";

const ICONS: Record<WeekEvent["kind"], LucideIcon> = {
	scheduled: CalendarClock,
	lottery: Ticket,
	giveaway: Gift,
	birthday: Cake,
};

export function WeekPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const overview = useGuildOverview(guildId);
	const week = useWeek(guildId);
	const channels = useChannels(guildId);

	usePageTitle(t("week.title"), overview.data?.name);

	if (week.isError) return <ErrorState error={week.error} onRetry={() => void week.refetch()} />;
	if (week.data === undefined) return <Skeleton className="h-96 w-full" />;

	const days = groupByDay(week.data.events, t);
	const named = channels.data ?? [];

	return (
		<>
			<PageHeader server={overview.data} title={t("week.title")} subtitle={t("week.subtitle")} />
			<Summary>{weekSummary(week.data, t)}</Summary>

			{days.length === 0 && (
				<Card>
					<EmptyState icon={<CalendarDays size={28} />} title={t("week.emptyTitle")} body={t("week.emptyBody")} />
				</Card>
			)}

			{days.map((day) => (
				<section key={day.key} aria-labelledby={`day-${day.key}`} className="flex flex-col gap-3">
					<SectionHeading as="h2" id={`day-${day.key}`} count={day.events.length}>
						{day.heading}
					</SectionHeading>
					<DividedList className="bg-card">
						{day.events.map((event, index) => {
							const Icon = ICONS[event.kind];
							const detail = eventDetail(event, named, t);
							return (
								<li key={`${event.kind}:${event.at}:${String(index)}`}>
									<Link
										to={`/guilds/${guildId}${EVENT_PATHS[event.kind]}`}
										className="hover:bg-muted/60 group flex items-center gap-3 px-4 py-3 transition-colors duration-150"
									>
										<time dateTime={event.at} className="text-muted-foreground w-12 shrink-0 text-sm tabular-nums">
											{timeOfDay(event.at)}
										</time>
										<Icon size={18} aria-hidden="true" className="text-muted-foreground shrink-0" />
										<span className="min-w-0 flex-1">
											<span className="line-clamp-2 block font-medium break-words">{eventTitle(event, named, t)}</span>
											{detail !== undefined && (
												<span className="text-muted-foreground block truncate text-sm">{detail}</span>
											)}
										</span>
										<HoverChevron />
									</Link>
								</li>
							);
						})}
					</DividedList>
				</section>
			))}
		</>
	);
}
