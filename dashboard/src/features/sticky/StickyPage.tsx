import { STICKY_LIMITS, stickyBlocked, type StickyEntry } from "@testify/shared";
import { Pin, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { useUndo } from "@/app/undo";
import {
	ChannelPicker,
	Field,
	FIELD,
	RowActions,
	SavingIndicator,
	savingStateOf,
	SettingRows,
	Warning,
} from "@/components/form";
import { Button, Card, EmptyState, PageHeader, SectionHeading, Skeleton, Summary } from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { StickyRow } from "@/features/sticky/components/StickyRow";
import { stickySummary } from "@/features/sticky/sticky.utils";
import { useRemoveSticky, useSaveSticky, useSticky } from "@/features/sticky/useSticky";
import { SendTest } from "@/features/test-post/SendTest";
import { PostPreview } from "@/features/welcome/components/PostPreview";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { channelLabel } from "@/lib/channels";
import { cn } from "@/lib/cn";
import { problemText } from "@/lib/problemText";
import { markupWarning, sanitiseInput } from "@/lib/sanitise";

export function StickyPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();

	const list = useSticky(guildId);
	const channels = useChannels(guildId);
	const overview = useGuildOverview(guildId);
	const save = useSaveSticky(guildId);
	const remove = useRemoveSticky(guildId);
	const undo = useUndo();

	usePageTitle(t("sticky.title"), overview.data?.name);

	const [channelId, setChannelId] = useState<string | null>(null);
	const [message, setMessage] = useState("");
	const [cap, setCap] = useState(STICKY_LIMITS.minCap * 5);

	if (list.isPending) return <Skeleton className="h-96 w-full" />;
	if (list.isError) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />;

	const taken = list.data.entries.map((entry) => entry.channelId);
	const keyOf = (channel: string): string => `sticky:${guildId}:${channel}`;
	const entries = list.data.entries.filter((entry) => !undo.isHidden(keyOf(entry.channelId)));
	const channelName = (id: string): string => channelLabel(channels.data ?? [], id, t);
	const blocked = problemText(stickyBlocked({ channelId, message }, taken), t);
	const full = taken.length >= list.data.limit;

	function add(): void {
		if (blocked !== null || channelId === null || full) return;
		save.mutate({ channelId, message: sanitiseInput(message), cap });
		setChannelId(null);
		setMessage("");
	}

	return (
		<>
			<PageHeader
				server={overview.data}
				title={t("sticky.title")}
				subtitle={t("sticky.subtitle")}
				action={<SavingIndicator state={savingStateOf(save.isPending || remove.isPending, save.isSuccess)} />}
			/>

			<Summary>{stickySummary(entries.length, t)}</Summary>

			<section aria-labelledby="current-heading" className="flex flex-col gap-3">
				<SectionHeading
					as="h2"
					id="current-heading"
					count={t("sticky.countOf", { used: taken.length, limit: list.data.limit })}
				>
					{t("sticky.inUse")}
				</SectionHeading>

				{entries.length === 0 ? (
					<Card>
						<EmptyState icon={<Pin size={28} />} title={t("sticky.emptyTitle")} body={t("sticky.emptyBody")} />
					</Card>
				) : (
					<ul className="flex flex-col gap-3">
						{entries.map((entry: StickyEntry) => (
							<StickyRow
								key={entry.channelId}
								entry={entry}
								channels={channels.data ?? []}
								saving={save.isPending}
								onSave={(next) => {
									save.mutate({ ...next, message: sanitiseInput(next.message) });
								}}
								onRemove={() => {
									undo.schedule({
										key: keyOf(entry.channelId),
										label: t("undo.sticky", { channel: channelName(entry.channelId) }),
										commit: () => remove.mutateAsync({ channelId: entry.channelId }),
									});
								}}
							/>
						))}
					</ul>
				)}
			</section>

			<SettingRows title={t("sticky.add")} description={t("sticky.addBody")}>
				<ChannelPicker
					label={t("sticky.channel")}
					hint={t("sticky.channelHint")}
					channels={(channels.data ?? []).filter((channel) => !taken.includes(channel.id))}
					value={channelId}
					allowNone={false}
					onChange={setChannelId}
				/>

				<Field label={t("sticky.message")} htmlFor="sticky-message">
					<textarea
						id="sticky-message"
						rows={3}
						value={message}
						maxLength={STICKY_LIMITS.maxMessage}
						onChange={(event) => {
							setMessage(event.target.value);
						}}
						className={cn(FIELD, "resize-y")}
					/>
					<span className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
						{t("common.partOf", { part: message.length, whole: STICKY_LIMITS.maxMessage })}
					</span>
					<PostPreview text={message} empty={t("common.previewEmpty")} />
					<SendTest test={{ kind: "plain", message }} />
				</Field>

				<Field label={t("sticky.repostAfter")} htmlFor="sticky-cap" hint={t("sticky.repostHint")}>
					<div className="flex flex-wrap items-center gap-2">
						<input
							id="sticky-cap"
							type="number"
							inputMode="numeric"
							min={STICKY_LIMITS.minCap}
							max={STICKY_LIMITS.maxCap}
							value={cap}
							onChange={(event) => {
								setCap(Number(event.target.value));
							}}
							className={cn(FIELD, "w-24")}
						/>
						<span className="text-muted-foreground text-sm">{t("sticky.messages")}</span>
					</div>
				</Field>

				{markupWarning(message) !== null && <Warning>{markupWarning(message)}</Warning>}
				{full && <Warning>{t("sticky.full")}</Warning>}
				{blocked !== null && message !== "" && <Warning>{blocked}</Warning>}
				{save.error !== null && (
					<Warning>{save.error instanceof ApiError ? save.error.message : t("common.couldNotSave")}</Warning>
				)}

				<RowActions>
					<Button disabled={blocked !== null || full || save.isPending} onClick={add}>
						<Plus size={16} aria-hidden="true" /> {t("sticky.addSticky")}
					</Button>
				</RowActions>
			</SettingRows>

			{remove.error !== null && (
				<Warning>
					<Trash2 size={14} aria-hidden="true" className="mr-1 inline" />
					{remove.error instanceof ApiError ? remove.error.message : t("common.couldNotRemove")}
				</Warning>
			)}
		</>
	);
}
