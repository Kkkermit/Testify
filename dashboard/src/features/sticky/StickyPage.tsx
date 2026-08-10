import { STICKY_LIMITS, stickyBlocked, type StickyEntry } from "@testify/shared";
import { Pin, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { ChannelPicker, Field, FIELD, SavingIndicator, savingStateOf, Warning } from "@/components/form";
import { Button, Card, EmptyState, Eyebrow, PageHeader, Skeleton } from "@/components/primitives";
import { CARD_HEADING } from "@/components/primitives/textStyles";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { StickyRow } from "@/features/sticky/components/StickyRow";
import { useRemoveSticky, useSaveSticky, useSticky } from "@/features/sticky/useSticky";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { markupWarning, sanitiseInput } from "@/lib/sanitise";

/** A list keyed by channel rather than a page of switches, which is why this is its own screen. */
export function StickyPage(): React.JSX.Element {
	const { guildId = "" } = useParams();

	const list = useSticky(guildId);
	const channels = useChannels(guildId);
	const overview = useGuildOverview(guildId);
	const save = useSaveSticky(guildId);
	const remove = useRemoveSticky(guildId);

	usePageTitle("Sticky messages", overview.data?.name);

	const [channelId, setChannelId] = useState<string | null>(null);
	const [message, setMessage] = useState("");
	const [cap, setCap] = useState(STICKY_LIMITS.minCap * 5);

	if (list.isPending) return <Skeleton className="h-96 w-full" />;
	if (list.isError) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />;

	const entries = list.data.entries;
	const taken = entries.map((entry) => entry.channelId);
	const blocked = stickyBlocked({ channelId, message }, taken);
	const full = entries.length >= list.data.limit;

	function add(): void {
		if (blocked !== null || channelId === null || full) return;
		save.mutate({ channelId, message: sanitiseInput(message), cap });
		setChannelId(null);
		setMessage("");
	}

	return (
		<>
			<PageHeader
				eyebrow={overview.data?.name}
				title="Sticky messages"
				subtitle="A message Testify reposts to keep it at the bottom of a busy channel."
				action={<SavingIndicator state={savingStateOf(save.isPending || remove.isPending, save.isSuccess)} />}
			/>

			<section aria-labelledby="current-heading" className="flex flex-col gap-3">
				<Eyebrow as="h2" id="current-heading" count={`${String(entries.length)} of ${String(list.data.limit)}`}>
					In use
				</Eyebrow>

				{entries.length === 0 ? (
					<Card>
						<EmptyState
							icon={<Pin size={28} />}
							title="No sticky messages yet"
							body="Pick a channel below and Testify will keep a message pinned to the bottom of it."
						/>
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
									remove.mutate({ channelId: entry.channelId });
								}}
							/>
						))}
					</ul>
				)}
			</section>

			<Card className="motion-pop flex flex-col gap-4">
				<div>
					<h2 className={CARD_HEADING}>Add a sticky</h2>
					<p className="text-muted-foreground text-sm">One per channel. Editing an existing one is done above.</p>
				</div>

				<ChannelPicker
					label="Channel"
					hint="Testify needs permission to post here, or the sticky will never appear."
					channels={(channels.data ?? []).filter((channel) => !taken.includes(channel.id))}
					value={channelId}
					allowNone={false}
					onChange={setChannelId}
				/>

				<Field label="Message" htmlFor="sticky-message">
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
						{message.length} of {STICKY_LIMITS.maxMessage}
					</span>
				</Field>

				<Field label="Repost after" htmlFor="sticky-cap" hint="How many messages pass before Testify posts it again.">
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
						<span className="text-muted-foreground text-sm">messages</span>
					</div>
				</Field>

				{markupWarning(message) !== null && <Warning>{markupWarning(message)}</Warning>}
				{full && <Warning>That is the most stickies Testify can hold. Remove one to add another.</Warning>}
				{blocked !== null && message !== "" && <Warning>{blocked}</Warning>}
				{save.error !== null && (
					<Warning>{save.error instanceof ApiError ? save.error.message : "That could not be saved."}</Warning>
				)}

				<div>
					<Button disabled={blocked !== null || full || save.isPending} onClick={add}>
						<Plus size={16} aria-hidden="true" /> Add sticky
					</Button>
				</div>
			</Card>

			{remove.error !== null && (
				<Warning>
					<Trash2 size={14} aria-hidden="true" className="mr-1 inline" />
					{remove.error instanceof ApiError ? remove.error.message : "That could not be removed."}
				</Warning>
			)}
		</>
	);
}
