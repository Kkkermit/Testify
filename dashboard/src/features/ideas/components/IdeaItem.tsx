import { IDEA_LIMITS, type IdeaDecision, type IdeaRow } from "@testify/shared";
import { Check, ExternalLink, RotateCcw, ThumbsDown, ThumbsUp, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Field, FIELD, Warning } from "@/components/form";
import { Badge, type BadgeTone, Button, cardClass } from "@/components/primitives";
import { type TranslationKey } from "@/i18n";
import { dateAndTime, since } from "@/lib/datetime";
import { markupWarning, sanitiseInput } from "@/lib/sanitise";

const TONE: Record<IdeaRow["status"], BadgeTone> = { open: "warning", accepted: "success", declined: "danger" };

const STATUS_LABEL: Record<IdeaRow["status"], TranslationKey> = {
	open: "ideas.statusOpen",
	accepted: "ideas.statusAccepted",
	declined: "ideas.statusDeclined",
};

/** One idea, with its votes and the decision beside it; deciding here posts and DMs exactly as Discord's buttons do. */
export function IdeaItem({
	idea,
	busy,
	onDecide,
	onRemove,
}: {
	idea: IdeaRow;
	busy: boolean;
	onDecide: (decision: IdeaDecision) => void;
	onRemove: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [reason, setReason] = useState("");
	const markup = markupWarning(reason);
	const decide = (status: IdeaDecision["status"]): void => {
		onDecide({ status, reason: sanitiseInput(reason) });
	};

	return (
		<li className={cardClass("compact", "flex flex-col gap-3")}>
			<div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
				<h3 className="text-sm font-semibold tabular-nums">{t("ideas.number", { number: idea.number })}</h3>
				<Badge tone={TONE[idea.status]}>{t(STATUS_LABEL[idea.status])}</Badge>
			</div>

			<p className="text-sm whitespace-pre-line [overflow-wrap:anywhere]">{idea.text}</p>

			<p className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
				<span>{t("ideas.from", { name: idea.authorName, when: since(idea.createdAt) })}</span>
				<span className="inline-flex items-center gap-1 tabular-nums">
					<ThumbsUp size={13} aria-hidden="true" />
					<span className="sr-only">{t("ideas.upVotes")}</span>
					{idea.up}
				</span>
				<span className="inline-flex items-center gap-1 tabular-nums">
					<ThumbsDown size={13} aria-hidden="true" />
					<span className="sr-only">{t("ideas.downVotes")}</span>
					{idea.down}
				</span>
			</p>

			{idea.status !== "open" && (
				<div className="text-sm">
					<p className="text-muted-foreground text-xs">
						{t("ideas.decidedBy", {
							name: idea.decidedByName ?? t("common.unknownAccount"),
							when: idea.decidedAt === null ? "" : dateAndTime(idea.decidedAt),
						})}
					</p>
					{idea.reason !== "" && <blockquote className="border-border mt-1 border-l-2 pl-3">{idea.reason}</blockquote>}
				</div>
			)}

			{idea.status === "open" && (
				<Field label={t("ideas.reason")} htmlFor={`reason-${idea.id}`} hint={t("ideas.reasonHint")}>
					<input
						id={`reason-${idea.id}`}
						value={reason}
						maxLength={IDEA_LIMITS.maxReason}
						onChange={(event) => {
							setReason(event.target.value);
						}}
						className={FIELD}
					/>
				</Field>
			)}
			{markup !== null && <Warning>{markup}</Warning>}

			<div className="flex flex-wrap gap-2">
				{idea.status === "open" ? (
					<>
						<Button
							variant="secondary"
							disabled={busy || markup !== null}
							onClick={() => {
								decide("accepted");
							}}
						>
							<Check size={15} aria-hidden="true" />
							{t("ideas.accept")}
						</Button>
						<Button
							variant="secondary"
							disabled={busy || markup !== null}
							onClick={() => {
								decide("declined");
							}}
						>
							<X size={15} aria-hidden="true" />
							{t("ideas.decline")}
						</Button>
					</>
				) : (
					<Button
						variant="secondary"
						disabled={busy}
						onClick={() => {
							decide("open");
						}}
					>
						<RotateCcw size={15} aria-hidden="true" />
						{t("ideas.reopen")}
					</Button>
				)}
				{idea.messageUrl !== null && (
					<a
						href={idea.messageUrl}
						target="_blank"
						rel="noreferrer"
						className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-1 px-2 text-sm"
					>
						<ExternalLink size={14} aria-hidden="true" />
						{t("ideas.openInDiscord")}
					</a>
				)}
				<Button variant="ghost" disabled={busy} onClick={onRemove}>
					<Trash2 size={16} aria-hidden="true" />
					<span className="sr-only">{t("ideas.deleteIdea", { number: idea.number })}</span>
				</Button>
			</div>
		</li>
	);
}
