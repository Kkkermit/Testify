import { AUDIT_EVENTS, AUDIT_GROUPS, type AuditLogPut, auditLogChanged } from "@testify/shared";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { ChannelPicker, SavingIndicator, savingStateOf, Toggle, Warning } from "@/components/form";
import { Button, PageHeader, Skeleton } from "@/components/primitives";
import { draftFrom, groupState, saveBlocked, setGroup, toggleEvent } from "@/features/audit-log/auditLog.utils";
import { EventGroup } from "@/features/audit-log/components/EventGroup";
import { Step } from "@/features/audit-log/components/Step";
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

	// A channel and a set of events are one decision, so nothing is written until Save.
	useEffect(() => {
		if (config.data !== undefined) setDraft(draftFrom(config.data));
	}, [config.data]);

	if (config.isError) return <ErrorState error={config.error} onRetry={() => void config.refetch()} />;
	if (config.isPending || draft === null) return <Skeleton className="h-96 w-full" />;

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
				eyebrow={overview.data?.name}
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

			{/* Two numbered steps: the destination and the event list are different decisions. */}
			<Step
				number={1}
				title="Where the log goes"
				describes="One channel receives every event chosen below."
				className="motion-pop"
			>
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
			</Step>

			<Step
				number={2}
				title="What gets recorded"
				describes="Tick a heading to take the whole group."
				action={
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
				}
			>
				{/* Columns, because a grid row is as tall as its tallest cell; `gap` does not apply here, so each panel carries its own margin. */}
				<div className="-mb-4 gap-x-4 sm:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
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

				{notice !== null && <p className="text-muted-foreground text-xs">{notice}</p>}
			</Step>

			{(blocked !== null || save.error !== null) && (
				<div className="flex flex-col gap-2">
					{blocked !== null && <Warning>{blocked}</Warning>}
					{save.error !== null && (
						<Warning>{save.error instanceof ApiError ? save.error.message : "That change could not be saved."}</Warning>
					)}
				</div>
			)}
		</>
	);
}
