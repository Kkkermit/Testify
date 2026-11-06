import { type ModmailConversation, type ModmailSettingsPatch } from "@testify/shared";
import { ExternalLink, Mails } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import {
	ChannelPicker,
	Field,
	postableChannels,
	Refusal,
	SavingIndicator,
	savingStateOf,
	SELECT,
	SettingRows,
	Toggle,
	Warning,
} from "@/components/form";
import {
	Badge,
	Button,
	Card,
	DividedList,
	EmptyState,
	PageHeader,
	SectionHeading,
	Skeleton,
	Summary,
} from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels, useRoles } from "@/features/levelling/useLevelling";
import { modmailSummary } from "@/features/modmail/modmail.utils";
import {
	useCloseConversation,
	useModmailConversations,
	useModmailSettings,
	useSaveModmailSettings,
} from "@/features/modmail/useModmail";
import { usePageTitle } from "@/hooks/usePageTitle";
import { channelLabel } from "@/lib/channels";
import { since } from "@/lib/datetime";
import { personName } from "@/lib/people";

export function ModmailPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();

	const settings = useModmailSettings(guildId);
	const channels = useChannels(guildId);
	const roles = useRoles(guildId);
	const overview = useGuildOverview(guildId);
	const save = useSaveModmailSettings(guildId);

	usePageTitle(t("modmail.title"), overview.data?.name);

	if (settings.isError) return <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />;
	if (settings.isPending) return <Skeleton className="h-96 w-full" />;

	const current = settings.data;
	const postable = postableChannels(channels.data ?? []);
	const channel = channelLabel(postable, current.channelId, t);
	const pingable = (roles.data ?? []).filter((role) => role.id !== guildId && !role.managed);
	const write = (patch: ModmailSettingsPatch): void => {
		save.mutate(patch);
	};

	return (
		<>
			<PageHeader
				server={overview.data}
				title={t("modmail.title")}
				subtitle={t("modmail.subtitle")}
				action={<SavingIndicator state={savingStateOf(save.isPending, save.isSuccess)} />}
			/>

			<Summary>{modmailSummary(current, channel, t)}</Summary>
			{current.channelId !== null && !current.canUse && <Warning>{t("modmail.cannotUse", { channel })}</Warning>}

			<SettingRows>
				<Toggle
					label={t("modmail.enabled")}
					hint={current.channelId === null ? t("modmail.enabledHintNoChannel") : t("modmail.enabledHint")}
					checked={current.enabled}
					disabled={save.isPending || (!current.enabled && current.channelId === null)}
					onChange={(enabled) => {
						write({ enabled });
					}}
				/>

				<ChannelPicker
					label={t("modmail.channel")}
					hint={t("modmail.channelHint")}
					channels={postable}
					value={current.channelId}
					allowNone={false}
					onChange={(channelId) => {
						write({ channelId });
					}}
				/>

				<Field label={t("modmail.ping")} hint={t("modmail.pingHint")}>
					<select
						className={SELECT}
						value={current.pingRoleId ?? ""}
						onChange={(event) => {
							write({ pingRoleId: event.target.value === "" ? null : event.target.value });
						}}
					>
						<option value="">{t("modmail.pingNobody")}</option>
						{pingable.map((role) => (
							<option key={role.id} value={role.id}>
								{role.name}
							</option>
						))}
					</select>
				</Field>

				<Field label={t("modmail.signed")} hint={t("modmail.signedHint")}>
					<select
						className={SELECT}
						value={current.anonymous ? "anonymous" : "named"}
						onChange={(event) => {
							write({ anonymous: event.target.value === "anonymous" });
						}}
					>
						<option value="named">{t("modmail.signedNamed")}</option>
						<option value="anonymous">{t("modmail.signedAnonymous")}</option>
					</select>
				</Field>
			</SettingRows>
			<Refusal error={save.error} />

			<Conversations guildId={guildId} />
		</>
	);
}

function Conversations({ guildId }: { guildId: string }): React.JSX.Element {
	const { t } = useTranslation();
	const conversations = useModmailConversations(guildId);
	const close = useCloseConversation(guildId);

	return (
		<section aria-labelledby="modmail-open" className="flex flex-col gap-3">
			<SectionHeading as="h2" id="modmail-open" count={conversations.data?.items.length}>
				{t("modmail.openTitle")}
			</SectionHeading>

			{conversations.isError ? (
				<ErrorState as="h2" error={conversations.error} onRetry={() => void conversations.refetch()} />
			) : conversations.isPending ? (
				<Skeleton className="h-32 w-full" />
			) : !conversations.data.visible ? (
				<Warning>{t("modmail.hidden")}</Warning>
			) : conversations.data.items.length === 0 ? (
				<Card>
					<EmptyState icon={<Mails size={28} />} title={t("modmail.emptyTitle")} body={t("modmail.emptyBody")} />
				</Card>
			) : (
				<Card padding="none">
					<DividedList className="rounded-card border-0">
						{conversations.data.items.map((conversation) => (
							<ConversationRow
								key={conversation.id}
								conversation={conversation}
								busy={close.isPending && close.variables === conversation.id}
								onClose={() => {
									close.mutate(conversation.id);
								}}
							/>
						))}
					</DividedList>
				</Card>
			)}
			<Refusal error={close.error} />
		</section>
	);
}

function ConversationRow({
	conversation,
	busy,
	onClose,
}: {
	conversation: ModmailConversation;
	busy: boolean;
	onClose: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const name = personName(conversation.username, t);

	return (
		<li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex flex-wrap items-center gap-2">
					<h3 className="text-sm font-semibold [overflow-wrap:anywhere]">{name}</h3>
					{conversation.waiting && <Badge tone="warning">{t("modmail.waiting")}</Badge>}
				</div>
				<p className="text-muted-foreground text-xs">
					{t("modmail.times", { opened: since(conversation.openedAt), last: since(conversation.lastMessageAt) })}
				</p>
			</div>
			{conversation.threadUrl !== null && (
				<a
					href={conversation.threadUrl}
					target="_blank"
					rel="noreferrer"
					className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-1 px-2 text-sm"
				>
					<ExternalLink size={14} aria-hidden="true" />
					{t("modmail.openThread")}
				</a>
			)}
			<Button variant="secondary" disabled={busy} onClick={onClose} aria-label={t("modmail.closeWith", { name })}>
				{t("modmail.close")}
			</Button>
		</li>
	);
}
