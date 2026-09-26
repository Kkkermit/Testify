import { WARNING_LIMITS, type MemberDetail, warningProblem } from "@testify/shared";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Field, Warning } from "@/components/form";
import { FIELD } from "@/components/form/fieldStyles";
import { Button, Card, CARD_HEADING, DividedList } from "@/components/primitives";
import { canChangeWarnings, clearConfirmed, warningSummary } from "@/features/members/memberDetail.utils";
import { WarningRow } from "@/features/warnings/components/WarningRow";
import { problemText } from "@/lib/problemText";
import { sanitiseInput } from "@/lib/sanitise";

export function WarningsCard({
	detail,
	busy,
	result,
	onWarn,
	onEdit,
	onRemove,
	onClear,
}: {
	detail: MemberDetail;
	busy: boolean;
	/** What the last warning issued here did to the member, once it has come back. */
	result: string | null;
	onWarn: (reason: string, done: () => void) => void;
	onEdit: (warnId: string, reason: string, done: () => void) => void;
	onRemove: (warnId: string) => void;
	onClear: (done: () => void) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [reason, setReason] = useState("");
	const [confirming, setConfirming] = useState(false);
	const [typed, setTyped] = useState("");

	const canModerate = detail.moderationProblem === null;
	const canChange = canChangeWarnings(detail);
	const problem = problemText(warningProblem(reason), t);

	function cancel(): void {
		setConfirming(false);
		setTyped("");
	}

	return (
		<Card className="flex flex-col gap-4">
			<div>
				<h2 className={CARD_HEADING}>{t("members.warnings")}</h2>
				<p className="text-muted-foreground text-sm">{warningSummary(detail.warnings, t)}</p>
			</div>

			{!canModerate && <Warning>{detail.moderationProblem}</Warning>}

			{detail.warnings.length > 0 && (
				<DividedList>
					{detail.warnings.map((warning) => (
						<WarningRow
							key={warning.id}
							warning={warning}
							canChange={canChange}
							busy={busy}
							onEdit={(next, done) => {
								onEdit(warning.id, next, done);
							}}
							onRemove={() => {
								onRemove(warning.id);
							}}
						/>
					))}
				</DividedList>
			)}

			{canModerate && (
				<>
					<Field label={t("members.issue")} hint={t("members.issueHint")} htmlFor="warn-reason">
						<input
							id="warn-reason"
							className={FIELD}
							value={reason}
							maxLength={WARNING_LIMITS.maxReason}
							placeholder={t("members.reasonPlaceholder")}
							onChange={(event) => {
								setReason(event.target.value);
							}}
						/>
					</Field>

					<div className="flex flex-wrap items-center gap-3">
						<Button
							disabled={problem !== null || busy}
							onClick={() => {
								onWarn(sanitiseInput(reason), () => {
									setReason("");
								});
							}}
						>
							{t("members.addWarning")}
						</Button>
						<p role="status" className="text-sm">
							{result}
						</p>
					</div>
				</>
			)}

			{canChange && detail.warnings.length > 0 && !confirming && (
				<div>
					<Button
						variant="ghost"
						disabled={busy}
						onClick={() => {
							setConfirming(true);
						}}
					>
						<Trash2 size={16} aria-hidden="true" /> {t("members.clearEvery")}
					</Button>
				</div>
			)}

			{confirming && (
				<div className="border-destructive/40 flex flex-col gap-3 rounded-field border p-4">
					<Field label={t("members.typeToClear", { name: detail.username })} htmlFor="clear-confirm">
						<input
							id="clear-confirm"
							className={FIELD}
							value={typed}
							autoComplete="off"
							onChange={(event) => {
								setTyped(event.target.value);
							}}
						/>
					</Field>
					<Warning>{t("members.deleteWarning")}</Warning>

					<div className="flex flex-wrap gap-3">
						<Button
							variant="destructive"
							disabled={!clearConfirmed(typed, detail) || busy}
							onClick={() => {
								onClear(cancel);
							}}
						>
							{t("members.clearEvery")}
						</Button>
						<Button variant="ghost" onClick={cancel}>
							{t("common.cancel")}
						</Button>
					</div>
				</div>
			)}
		</Card>
	);
}
