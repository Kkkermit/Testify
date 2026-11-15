import { type ShardlensFlush, type ShardlensState, type ShardlensStatus } from "@testify/shared";
import { AlertTriangle, Check, ExternalLink, Send } from "lucide-react";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/app/ErrorState";
import { Refusal } from "@/components/form";
import { Badge, type BadgeTone, Button, Card, CARD_HEADING, DataList, Skeleton } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { useSendShardlens, useShardlens } from "@/features/owner/useControl";
import { type TranslationKey } from "@/i18n";
import { cn } from "@/lib/cn";
import { dateAndTime } from "@/lib/datetime";
import { formatNumber } from "@/lib/intl";

const STATES: Record<ShardlensState, { label: TranslationKey; body: TranslationKey; tone: BadgeTone }> = {
	off: { label: "owner.shardlensOff", body: "owner.shardlensOffBody", tone: "muted" },
	dryRun: { label: "owner.shardlensDryRun", body: "owner.shardlensDryRunBody", tone: "warning" },
	waiting: { label: "owner.shardlensWaiting", body: "owner.shardlensWaitingBody", tone: "warning" },
	sending: { label: "owner.shardlensSending", body: "owner.shardlensSendingBody", tone: "success" },
};

function SendNote({ flushed, dryRun }: { flushed: ShardlensFlush; dryRun: boolean }): React.JSX.Element {
	const { t } = useTranslation();

	if (flushed.problem !== null) {
		return (
			<>
				<AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
				<span>{t("owner.shardlensSendFailed", { problem: flushed.problem })}</span>
			</>
		);
	}

	const said =
		flushed.sent === 0 ? "owner.shardlensNothing" : dryRun ? "owner.shardlensPrinted" : "owner.shardlensSent";
	return (
		<>
			<Check size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
			<span>{t(said)}</span>
		</>
	);
}

function Figures({ status }: { status: ShardlensStatus }): React.JSX.Element {
	const { t } = useTranslation();
	const problem = status.lastProblem;

	return (
		<DataList
			rows={[
				{
					label: t("owner.shardlensMode"),
					value: t(
						status.mode === null
							? "owner.shardlensModeUnknown"
							: status.mode === "audit"
								? "owner.shardlensAudit"
								: "owner.shardlensPrivacy",
					),
				},
				{ label: t("owner.shardlensQueued"), value: formatNumber(status.queued) },
				{ label: t("owner.shardlensAwaiting"), value: formatNumber(status.waitingForResponse) },
				{ label: t("owner.shardlensDropped"), value: formatNumber(status.dropped) },
				{ label: t("owner.shardlensFailed"), value: formatNumber(status.failedSends) },
				{
					label: t("owner.shardlensLastProblem"),
					value:
						problem === null ? (
							t("owner.shardlensNoProblem")
						) : (
							<>
								<span className="font-mono">{problem.name}</span> · {dateAndTime(problem.at)}
							</>
						),
				},
			]}
		/>
	);
}

/** Where the bot's Shardlens analytics stand, for the owner only; the key itself never reaches the page. */
export function ShardlensCard(): React.JSX.Element {
	const { t } = useTranslation();
	const status = useShardlens();
	const send = useSendShardlens();

	let body: ReactNode;
	if (status.isPending) {
		body = <Skeleton className="h-40 w-full" />;
	} else if (status.data === undefined) {
		body = <ErrorState as="h2" error={status.error} onRetry={() => void status.refetch()} />;
	} else {
		const current = status.data;
		const look = STATES[current.state];
		body = (
			<>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<p className="text-muted-foreground text-sm">{t(look.body, { collector: current.collector ?? "" })}</p>
					<Badge tone={look.tone}>{t(look.label)}</Badge>
				</div>

				{current.state !== "off" && <Figures status={current} />}

				<div className="flex flex-wrap items-center gap-3">
					{current.state !== "off" && (
						<Button variant="ghost" aria-busy={send.isPending} disabled={send.isPending} onClick={() => send.mutate()}>
							<Send size={15} aria-hidden="true" />
							{send.isPending ? t("owner.shardlensSendBusy") : t("owner.shardlensSend")}
						</Button>
					)}
					{current.collector !== null && (
						<a
							href={current.collector}
							target="_blank"
							rel="noreferrer"
							className={cn(INLINE_TARGET, "text-accent gap-2 text-sm hover:underline")}
						>
							{t("owner.shardlensOpen")}
							<ExternalLink size={14} aria-hidden="true" />
						</a>
					)}
					<span
						role="status"
						className={cn(
							"flex items-start gap-2 text-xs",
							send.data?.problem === null ? "text-success" : "text-destructive-text",
						)}
					>
						{send.data !== undefined && <SendNote flushed={send.data} dryRun={current.state === "dryRun"} />}
					</span>
				</div>

				<Refusal error={send.error} fallback="common.didNotWork" />
			</>
		);
	}

	return (
		<Card className="flex flex-col gap-4">
			<h2 className={CARD_HEADING}>{t("owner.shardlens")}</h2>
			{body}
		</Card>
	);
}
