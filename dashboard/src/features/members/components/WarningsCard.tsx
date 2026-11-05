import { WARNING_LIMITS, type MemberDetail, warningProblem } from "@testify/shared";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Field, RowActions, SettingRows, Warning } from "@/components/form";
import { FIELD } from "@/components/form/fieldStyles";
import { Button, DividedList } from "@/components/primitives";
import { permissionLabel } from "@/features/commands/permissions.labels";
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
	const warnings = detail.warnings;

	function cancel(): void {
		setConfirming(false);
		setTyped("");
	}

	if (warnings === null) {
		return (
			<SettingRows
				title={t("members.warnings")}
				description={t("members.warningsHidden", { permission: permissionLabel("ModerateMembers", t) })}
			>
				{null}
			</SettingRows>
		);
	}

	return (
		<SettingRows title={t("members.warnings")} description={warningSummary(warnings, t)}>
			{!canModerate && <Warning>{detail.moderationProblem}</Warning>}

			{warnings.length > 0 && (
				<div>
					<DividedList>
						{warnings.map((warning) => (
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
				</div>
			)}

			{canModerate && (
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
			)}

			{(canModerate || (canChange && warnings.length > 0 && !confirming)) && (
				<RowActions>
					{canModerate && (
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
					)}
					{canChange && warnings.length > 0 && !confirming && (
						<Button
							variant="ghost"
							disabled={busy}
							onClick={() => {
								setConfirming(true);
							}}
						>
							<Trash2 size={16} aria-hidden="true" /> {t("members.clearEvery")}
						</Button>
					)}
					{canModerate && (
						<p role="status" className="text-sm">
							{result}
						</p>
					)}
				</RowActions>
			)}

			{confirming && (
				<>
					<Field
						label={t("members.typeToClear", { name: detail.username })}
						hint={t("members.confirmHint")}
						htmlFor="clear-confirm"
					>
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

					<RowActions>
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
					</RowActions>
				</>
			)}
		</SettingRows>
	);
}
