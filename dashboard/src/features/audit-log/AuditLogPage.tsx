import { AUDIT_EVENTS, AUDIT_GROUPS, type AuditLogPut, auditLogChanged } from "@testify/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { LeaveGuard } from "@/app/LeaveGuard";
import {
	ChannelPicker,
	postableChannels,
	SavingIndicator,
	savingStateOf,
	SettingRows,
	Toggle,
	Warning,
} from "@/components/form";
import { Button, PageHeader, Skeleton, Summary } from "@/components/primitives";
import {
	auditSummary,
	draftFrom,
	groupState,
	saveBlocked,
	setGroup,
	toggleEvent,
} from "@/features/audit-log/auditLog.utils";
import { EventGroup } from "@/features/audit-log/components/EventGroup";
import { useAuditLog, useSaveAuditLog } from "@/features/audit-log/useAuditLog";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { channelLabel } from "@/lib/channels";

export function AuditLogPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();

	const config = useAuditLog(guildId);
	const channels = useChannels(guildId);
	const overview = useGuildOverview(guildId);
	const save = useSaveAuditLog(guildId);

	usePageTitle(t("auditLog.title"), overview.data?.name);

	const [draft, setDraft] = useState<AuditLogPut | null>(null);

	useEffect(() => {
		if (config.data !== undefined) setDraft(draftFrom(config.data));
	}, [config.data]);

	if (config.isError) return <ErrorState error={config.error} onRetry={() => void config.refetch()} />;
	if (config.isPending || draft === null) return <Skeleton className="h-96 w-full" />;

	const saved = config.data;
	const dirty = auditLogChanged(saved, draft);
	const blocked = saveBlocked(draft, t);
	const notice = draft.events.length === AUDIT_EVENTS.length ? t("auditLog.allSelected") : null;

	function edit(change: Partial<AuditLogPut>): void {
		setDraft((current) => (current === null ? current : { ...current, ...change }));
	}

	return (
		<>
			<LeaveGuard when={dirty && !save.isPending} />
			<PageHeader
				server={overview.data}
				title={t("auditLog.title")}
				subtitle={t("auditLog.subtitle")}
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
								{t("common.discard")}
							</Button>
						)}
						<Button
							disabled={!dirty || blocked !== null || save.isPending}
							onClick={() => {
								save.mutate(draft);
							}}
						>
							{t("common.saveChanges")}
						</Button>
					</div>
				}
			/>

			<Summary>
				{auditSummary(saved, channelLabel(postableChannels(channels.data ?? []), saved.channelId, t), t)}
			</Summary>

			<SettingRows title={t("auditLog.whereTitle")} description={t("auditLog.whereBody")}>
				<Toggle
					label={t("auditLog.record")}
					hint={t("auditLog.recordHint")}
					checked={draft.enabled}
					onChange={(enabled) => {
						edit({ enabled });
					}}
				/>

				<ChannelPicker
					label={t("auditLog.postTo")}
					hint={t("auditLog.postToHint")}
					channels={channels.data ?? []}
					value={draft.channelId}
					allowNone={false}
					onChange={(channelId) => {
						edit({ channelId });
					}}
				/>
			</SettingRows>

			<SettingRows
				title={t("auditLog.whatTitle")}
				description={t("auditLog.whatBody")}
				action={
					<div className="flex items-center gap-2">
						<p className="text-muted-foreground text-sm tabular-nums" aria-live="polite">
							{t("common.chosen", { count: draft.events.length, max: AUDIT_EVENTS.length })}
						</p>
						<Button
							variant="ghost"
							onClick={() => {
								edit({ events: draft.events.length === AUDIT_EVENTS.length ? [] : [...AUDIT_EVENTS] });
							}}
						>
							{draft.events.length === AUDIT_EVENTS.length ? t("auditLog.clearAll") : t("auditLog.selectAll")}
						</Button>
					</div>
				}
			>
				{/* A row is padded, so the columns sit in a plain wrapper and keep their own margins. */}
				<div>
					{/* Columns, because a grid row is as tall as its tallest cell; `gap` does not apply here, so each panel carries its own margin. */}
					<div className="gap-x-4 sm:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid [&>*:last-child]:mb-0">
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
				</div>

				{notice !== null && <p className="text-muted-foreground text-xs">{notice}</p>}
			</SettingRows>

			{(blocked !== null || save.error !== null) && (
				<div className="flex flex-col gap-2">
					{blocked !== null && <Warning>{blocked}</Warning>}
					{save.error !== null && (
						<Warning>{save.error instanceof ApiError ? save.error.message : t("common.couldNotSave")}</Warning>
					)}
				</div>
			)}
		</>
	);
}
