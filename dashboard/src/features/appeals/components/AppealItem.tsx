import { APPEAL_LIMITS, type AppealDecision, type AppealRow } from "@testify/shared";
import { Check, ExternalLink, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Field, FIELD, Warning } from "@/components/form";
import { Badge, type BadgeTone, Button, cardClass } from "@/components/primitives";
import { type TranslationKey } from "@/i18n";
import { dateAndTime, since } from "@/lib/datetime";
import { personName } from "@/lib/people";
import { markupWarning, sanitiseInput } from "@/lib/sanitise";

export const APPEAL_STATUS_TONE: Record<AppealRow["status"], BadgeTone> = {
	open: "warning",
	accepted: "success",
	refused: "danger",
};

export const APPEAL_STATUS_LABEL: Record<AppealRow["status"], TranslationKey> = {
	open: "appeals.statusOpen",
	accepted: "appeals.statusAccepted",
	refused: "appeals.statusRefused",
};

export function AppealItem({
	appeal,
	busy,
	onDecide,
}: {
	appeal: AppealRow;
	busy: boolean;
	onDecide: (decision: AppealDecision) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [reason, setReason] = useState("");
	const markup = markupWarning(reason);
	const cleaned = sanitiseInput(reason);

	return (
		<li className={cardClass("compact", "flex flex-col gap-3")}>
			<div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
				<h3 className="text-sm font-semibold">{personName(appeal.username, t)}</h3>
				<Badge tone={APPEAL_STATUS_TONE[appeal.status]}>{t(APPEAL_STATUS_LABEL[appeal.status])}</Badge>
			</div>

			<p className="text-sm whitespace-pre-line [overflow-wrap:anywhere]">{appeal.text}</p>
			<p className="text-muted-foreground text-xs">
				{t("appeals.from", { id: appeal.userId, when: since(appeal.createdAt) })}
			</p>

			{appeal.status !== "open" && (
				<div className="text-sm">
					<p className="text-muted-foreground text-xs">
						{t("appeals.decidedBy", {
							name: personName(appeal.decidedByName ?? t("common.unknownAccount"), t),
							when: appeal.decidedAt === null ? "" : dateAndTime(appeal.decidedAt),
						})}
					</p>
					{appeal.reason !== "" && (
						<blockquote className="border-border mt-1 border-l-2 pl-3">{appeal.reason}</blockquote>
					)}
				</div>
			)}

			{appeal.status === "open" && (
				<Field label={t("appeals.reason")} htmlFor={`appeal-reason-${appeal.id}`} hint={t("appeals.reasonHint")}>
					<input
						id={`appeal-reason-${appeal.id}`}
						value={reason}
						maxLength={APPEAL_LIMITS.maxReason}
						onChange={(event) => {
							setReason(event.target.value);
						}}
						className={FIELD}
					/>
				</Field>
			)}
			{markup !== null && <Warning>{markup}</Warning>}

			<div className="flex flex-wrap gap-2">
				{appeal.status === "open" && (
					<>
						<Button
							variant="secondary"
							disabled={busy || markup !== null}
							onClick={() => {
								onDecide({ status: "accepted", reason: cleaned });
							}}
						>
							<Check size={15} aria-hidden="true" />
							{t("appeals.accept")}
						</Button>
						<Button
							variant="secondary"
							disabled={busy || markup !== null || cleaned === ""}
							onClick={() => {
								onDecide({ status: "refused", reason: cleaned });
							}}
						>
							<X size={15} aria-hidden="true" />
							{t("appeals.refuse")}
						</Button>
					</>
				)}
				{appeal.messageUrl !== null && (
					<a
						href={appeal.messageUrl}
						target="_blank"
						rel="noreferrer"
						className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-1 px-2 text-sm"
					>
						<ExternalLink size={14} aria-hidden="true" />
						{t("appeals.openInDiscord")}
					</a>
				)}
			</div>
		</li>
	);
}
