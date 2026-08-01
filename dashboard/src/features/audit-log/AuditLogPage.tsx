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

			<Card className="motion-pop flex flex-col gap-4">
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
			</Card>

			<section aria-labelledby="events-heading" className="flex flex-col gap-3">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2 id="events-heading" className="text-lg font-semibold">
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

				{/* `items-start` so a group of three is not stretched to the height of the group of six beside it. */}
				<div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

				{draft.events.length === AUDIT_EVENTS.length && (
					<p className="text-muted-foreground text-xs">
						Everything is selected, so events added in a future update are logged too.
					</p>
				)}

				{blocked !== null && <Warning>{blocked}</Warning>}
				{save.error !== null && (
					<Warning>{save.error instanceof ApiError ? save.error.message : "That change could not be saved."}</Warning>
				)}
			</section>
		</>
	);
}
