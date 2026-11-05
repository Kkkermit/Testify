import { inboxCount } from "@testify/shared";
import { Inbox as InboxIcon, Lightbulb, LifeBuoy, type LucideIcon, ShieldAlert } from "lucide-react";
import { type ReactNode } from "react";
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
import { featureLook } from "@/config/features";
import { MISSING_LABELS } from "@/features/guild-overview/featureStatus.labels";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { channelProblemText, inboxSummary, moreThan } from "@/features/inbox/inbox.utils";
import { useInbox } from "@/features/inbox/useInbox";
import { useChannels } from "@/features/levelling/useLevelling";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";
import { since } from "@/lib/datetime";

export function InboxPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const overview = useGuildOverview(guildId);
	const inbox = useInbox(guildId);
	const channels = useChannels(guildId);

	usePageTitle(t("inbox.title"), overview.data?.name);

	if (inbox.isError) return <ErrorState error={inbox.error} onRetry={() => void inbox.refetch()} />;
	if (inbox.data === undefined) return <Skeleton className="h-96 w-full" />;

	const data = inbox.data;
	const at = (path: string): string => `/guilds/${guildId}${path}`;

	return (
		<>
			<PageHeader server={overview.data} title={t("inbox.title")} subtitle={t("inbox.subtitle")} />
			<Summary>{inboxSummary(data, t)}</Summary>

			{inboxCount(data) === 0 && (
				<Card>
					<EmptyState icon={<InboxIcon size={28} />} title={t("inbox.emptyTitle")} body={t("inbox.emptyBody")} />
				</Card>
			)}

			{data.tickets.total > 0 && (
				<InboxGroup
					id="inbox-tickets"
					title={t("inbox.tickets")}
					body={t("inbox.ticketsBody")}
					count={data.tickets.total}
				>
					{data.tickets.items.map((ticket) => (
						<InboxRow
							key={ticket.channelId}
							to={at("/tickets")}
							icon={LifeBuoy}
							title={t("inbox.ticket", { id: ticket.ticketId })}
							detail={t("inbox.ticketFrom", { name: ticket.ownerName, when: since(ticket.openedAt) })}
						/>
					))}
					{moreThan(data.tickets) > 0 && (
						<InboxRow to={at("/tickets")} title={t("inbox.more", { count: moreThan(data.tickets) })} />
					)}
				</InboxGroup>
			)}

			{data.ideas.total > 0 && (
				<InboxGroup id="inbox-ideas" title={t("inbox.ideas")} body={t("inbox.ideasBody")} count={data.ideas.total}>
					{data.ideas.items.map((idea) => (
						<InboxRow
							key={idea.id}
							to={at("/ideas")}
							icon={Lightbulb}
							title={t("inbox.idea", { number: idea.number, text: idea.text })}
							detail={t("inbox.ideaVotes", { name: idea.authorName, up: idea.up, down: idea.down })}
						/>
					))}
					{moreThan(data.ideas) > 0 && (
						<InboxRow to={at("/ideas")} title={t("inbox.more", { count: moreThan(data.ideas) })} />
					)}
				</InboxGroup>
			)}

			{data.permissions.length > 0 && (
				<InboxGroup
					id="inbox-permissions"
					title={t("inbox.permissions")}
					body={t("overview.missingBody")}
					count={data.permissions.length}
				>
					{data.permissions.map((permission) => (
						<InboxRow key={permission} icon={ShieldAlert} title={t(MISSING_LABELS[permission])} />
					))}
				</InboxGroup>
			)}

			{data.channels.length > 0 && (
				<InboxGroup
					id="inbox-channels"
					title={t("inbox.channels")}
					body={t("inbox.channelsBody")}
					count={data.channels.length}
				>
					{data.channels.map((problem) => {
						const { icon, path } = featureLook(problem.feature);
						return (
							<InboxRow
								key={`${problem.feature}:${problem.channelId}`}
								{...(path === undefined ? {} : { to: path(guildId) })}
								icon={icon}
								title={channelProblemText(problem, channels.data ?? [], t)}
							/>
						);
					})}
				</InboxGroup>
			)}
		</>
	);
}

function InboxGroup({
	id,
	title,
	body,
	count,
	children,
}: {
	id: string;
	title: string;
	body: string;
	count: number;
	children: ReactNode;
}): React.JSX.Element {
	return (
		<section aria-labelledby={id} className="flex flex-col gap-3">
			<div>
				<SectionHeading as="h2" id={id} count={count}>
					{title}
				</SectionHeading>
				<p className="text-muted-foreground text-sm">{body}</p>
			</div>
			<DividedList className="bg-card">{children}</DividedList>
		</section>
	);
}

function InboxRow({
	to,
	icon: Icon,
	title,
	detail,
}: {
	to?: string;
	icon?: LucideIcon;
	title: string;
	detail?: string;
}): React.JSX.Element {
	const row = "flex items-center gap-3 px-4 py-3";
	const body = (
		<>
			{Icon === undefined ? (
				<span aria-hidden="true" className="w-[18px] shrink-0" />
			) : (
				<Icon size={18} aria-hidden="true" className="text-muted-foreground shrink-0" />
			)}
			<span className="min-w-0 flex-1">
				<span className="line-clamp-2 block font-medium break-words">{title}</span>
				{detail !== undefined && <span className="text-muted-foreground block truncate text-sm">{detail}</span>}
			</span>
		</>
	);

	return (
		<li>
			{to === undefined ? (
				<div className={row}>{body}</div>
			) : (
				<Link to={to} className={cn(row, "hover:bg-muted/60 group transition-colors duration-150")}>
					{body}
					<HoverChevron />
				</Link>
			)}
		</li>
	);
}
