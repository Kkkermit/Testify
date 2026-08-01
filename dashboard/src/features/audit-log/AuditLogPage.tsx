import { AUDIT_EVENTS, AUDIT_GROUPS, type AuditLogPut, auditLogChanged } from "@testify/shared";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { ChannelPicker, SavingIndicator, savingStateOf, Toggle, Warning } from "@/components/form";
import { Button, Card, PageHeader, Skeleton } from "@/components/primitives";
import { draftFrom, groupState, saveBlocked, setGroup, toggleEvent } from "@/features/audit-log/auditLog.utils";
import { EventGroup } from "@/features/audit-log/components/EventGroup";
import { useAuditLog, useSaveAuditLog } from "@/features/audit-log/useAuditLog";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";

export function AuditLogPage(): React.JSX.Element {
	const { guildId = "" } = useParams();

	const config = useAuditLog(guildId);
	const channels = useChannels(guildId);
	const overview = useGuildOverview(guildId);
	const save = useSaveAuditLog(guildId);

	usePageTitle("Audit logging", overview.data?.name);

	const [draft, setDraft] = useState<AuditLogPut | null>(null);

	// A channel and a set of events are one decision, so nothing is written until Save — the same shape as the
	// Discord panel this mirrors.
	useEffect(() => {
		if (config.data !== undefined) setDraft(draftFrom(config.data));
	}, [config.data]);

	if (config.isPending || draft === null) return <Skeleton className="h-96 w-full" />;
	if (config.isError) return <ErrorState error={config.error} onRetry={() => void config.refetch()} />;

	const saved = config.data;
	const dirty = auditLogChanged(saved, draft);
	const blocked = saveBlocked(draft);
	const notice =
		draft.events.length === AUDIT_EVENTS.length
			? "Everything is selected, so events added in a future update are logged too."
			: null;

	function edit(change: Partial<AuditLogPut>): void {
		setDraft((current) => (current === null ? current : { ...current, ...change }));
	}

	return (
		<>
			<PageHeader
				title="Audit logging"
				subtitle="Which server events Testify records, and where it posts them."
				action={
					<div className="flex items-center gap-3">
						<SavingIndicator state={savingStateOf(save.isPending, save.isSuccess && !dirty)} />
						{dirty && (
							<Button
								variant="ghost"
								onClick={() => {
									setDraft(draftFrom(saved));
								}}
							>
								Discard
							</Button>
						)}
						<Button
							disabled={!dirty || blocked !== null || save.isPending}
							onClick={() => {
								save.mutate(draft);
							}}
						>
							Save changes
						</Button>
					</div>
				}
			/>

			{/*
			 * One panel with divided rows rather than separate cards: the destination and the events are one
			 * configuration, and stacking them as cards put 24px of page gutter through the middle of it.
			 */}
			<Card padding="none" className="motion-pop divide-border divide-y">
				<div className="flex flex-col gap-3 px-6 py-5">
					<Toggle
						label="Record server events"
						hint="Off removes the configuration entirely. Nothing already posted is deleted."
						checked={draft.enabled}
						onChange={(enabled) => {
							edit({ enabled });
						}}
					/>

					<ChannelPicker
						label="Post the log to"
						hint="Somewhere only moderators can read — an audit log names who did what."
						channels={channels.data ?? []}
						value={draft.channelId}
						allowNone={false}
						onChange={(channelId) => {
							edit({ channelId });
						}}
					/>
				</div>

				<section aria-labelledby="events-heading">
					<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-6 py-4">
						<h2 id="events-heading" className="text-base font-semibold">
							Events
						</h2>
						<div className="flex items-center gap-2">
							<p className="text-muted-foreground text-sm tabular-nums" aria-live="polite">
								{draft.events.length} of {AUDIT_EVENTS.length} chosen
							</p>
							<Button
								variant="ghost"
								onClick={() => {
									edit({ events: draft.events.length === AUDIT_EVENTS.length ? [] : [...AUDIT_EVENTS] });
								}}
							>
								{draft.events.length === AUDIT_EVENTS.length ? "Clear all" : "Select all"}
							</Button>
						</div>
					</div>

					{/*
					 * Columns rather than a grid: the groups are two to six rows long, and a grid row is as tall as
					 * its tallest cell, which left a column of dead space under the short ones.
					 */}
					<div className="gap-x-8 px-6 pb-5 sm:columns-2 xl:columns-3 [&>*]:break-inside-avoid">
						{AUDIT_GROUPS.map((group) => (
							<EventGroup
								key={group}
								group={group}
								state={groupState(draft.events, group)}
								events={draft.events}
								onToggleGroup={(on) => {
									edit({ events: setGroup(draft.events, group, on) });
								}}
								onToggleEvent={(event) => {
									edit({ events: toggleEvent(draft.events, event) });
								}}
							/>
						))}
					</div>
				</section>

				{(notice !== null || blocked !== null || save.error !== null) && (
					<div className="flex flex-col gap-2 px-6 py-4">
						{notice !== null && <p className="text-muted-foreground text-xs">{notice}</p>}
						{blocked !== null && <Warning>{blocked}</Warning>}
						{save.error !== null && (
							<Warning>
								{save.error instanceof ApiError ? save.error.message : "That change could not be saved."}
							</Warning>
						)}
					</div>
				)}
			</Card>
		</>
	);
}
