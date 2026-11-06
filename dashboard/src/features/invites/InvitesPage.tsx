import { Mailbox } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import {
	ChannelPicker,
	postableChannels,
	Refusal,
	SavingIndicator,
	savingStateOf,
	SettingRows,
	Toggle,
	Warning,
} from "@/components/form";
import {
	Badge,
	Card,
	DividedList,
	EmptyState,
	PageHeader,
	SectionHeading,
	Skeleton,
	Summary,
} from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { inviteSummary, joinedHow } from "@/features/invites/invites.utils";
import { useInvites, useSaveInvites } from "@/features/invites/useInvites";
import { useChannels } from "@/features/levelling/useLevelling";
import { usePageTitle } from "@/hooks/usePageTitle";
import { channelLabel } from "@/lib/channels";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/datetime";
import { formatNumber } from "@/lib/intl";
import { personName } from "@/lib/people";

export function InvitesPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();

	const invites = useInvites(guildId);
	const channels = useChannels(guildId);
	const overview = useGuildOverview(guildId);
	const save = useSaveInvites(guildId);

	usePageTitle(t("invites.title"), overview.data?.name);

	if (invites.isError) return <ErrorState error={invites.error} onRetry={() => void invites.refetch()} />;
	if (invites.isPending) return <Skeleton className="h-96 w-full" />;

	const { settings, top, recent } = invites.data;
	const postable = postableChannels(channels.data ?? []);
	const channel = channelLabel(postable, settings.logChannelId, t);
	const memberLink = (userId: string): string => `/guilds/${guildId}/members/${userId}`;

	return (
		<>
			<PageHeader
				server={overview.data}
				title={t("invites.title")}
				subtitle={t("invites.subtitle")}
				action={<SavingIndicator state={savingStateOf(save.isPending, save.isSuccess)} />}
			/>

			<Summary>{inviteSummary(settings, channel, t)}</Summary>
			{settings.logChannelId !== null && !settings.canSend && (
				<Warning>{t("common.cannotPostIn", { channel })}</Warning>
			)}

			<SettingRows>
				<Toggle
					label={t("invites.enabled")}
					hint={settings.canRead ? t("invites.enabledHint") : t("invites.enabledHintCannotRead")}
					checked={settings.enabled}
					disabled={save.isPending || (!settings.enabled && !settings.canRead)}
					onChange={(enabled) => {
						save.mutate({ enabled });
					}}
				/>
				<ChannelPicker
					label={t("invites.channel")}
					hint={t("invites.channelHint")}
					channels={postable}
					value={settings.logChannelId}
					noneLabel={t("invites.noAnnouncements")}
					onChange={(logChannelId) => {
						save.mutate({ logChannelId });
					}}
				/>
			</SettingRows>
			<Refusal error={save.error} />

			<section aria-labelledby="invites-top" className="flex flex-col gap-3">
				<SectionHeading as="h2" id="invites-top">
					{t("invites.topTitle")}
				</SectionHeading>
				{top.length === 0 ? (
					<Card>
						<EmptyState icon={<Mailbox size={28} />} title={t("invites.emptyTitle")} body={t("invites.emptyBody")} />
					</Card>
				) : (
					<Card padding="none">
						<DividedList className="rounded-card border-0">
							{top.map((standing, index) => (
								<li key={standing.userId} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3">
									<span className="text-muted-foreground w-6 text-sm tabular-nums">{formatNumber(index + 1)}</span>
									<Link
										to={memberLink(standing.userId)}
										className={cn(INLINE_TARGET, "min-w-0 flex-1 text-sm font-medium [overflow-wrap:anywhere]")}
									>
										{personName(standing.name, t)}
									</Link>
									<span className="text-muted-foreground text-sm tabular-nums">
										{t("invites.standing", { stayed: standing.joins - standing.left, left: standing.left })}
									</span>
								</li>
							))}
						</DividedList>
					</Card>
				)}
			</section>

			{recent.length > 0 && (
				<section aria-labelledby="invites-recent" className="flex flex-col gap-3">
					<SectionHeading as="h2" id="invites-recent">
						{t("invites.recentTitle")}
					</SectionHeading>
					<Card padding="none">
						<DividedList className="rounded-card border-0">
							{recent.map((join) => (
								<li key={`${join.memberId}-${join.joinedAt}`} className="flex flex-col gap-1 px-6 py-3">
									<div className="flex flex-wrap items-center gap-2">
										<Link
											to={memberLink(join.memberId)}
											className={cn(INLINE_TARGET, "text-sm font-medium [overflow-wrap:anywhere]")}
										>
											{personName(join.memberName, t)}
										</Link>
										{join.leftAt !== null && <Badge>{t("invites.left")}</Badge>}
									</div>
									<p className="text-muted-foreground text-xs">
										{joinedHow(join, t)}
										{t("common.sentenceSeparator")}
										{shortDate(join.joinedAt)}
									</p>
								</li>
							))}
						</DividedList>
					</Card>
				</section>
			)}
		</>
	);
}
