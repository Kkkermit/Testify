import { WARNING_LIMITS, type MemberDetail, warningProblem } from "@testify/shared";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Field, Warning } from "@/components/form";
import { FIELD } from "@/components/form/fieldStyles";
import { Button, Card } from "@/components/primitives";
import { CARD_HEADING } from "@/components/primitives/textStyles";
import { WarningList } from "@/features/members/components/WarningList";
import { clearConfirmed, warningSummary } from "@/features/members/memberDetail.utils";

export function WarningsCard({
	detail,
	busy,
	onWarn,
	onRemove,
	onClear,
}: {
	detail: MemberDetail;
	busy: boolean;
	onWarn: (reason: string, done: () => void) => void;
	onRemove: (warnId: string) => void;
	onClear: (done: () => void) => void;
}): React.JSX.Element {
	const [reason, setReason] = useState("");
	const [confirming, setConfirming] = useState(false);
	const [typed, setTyped] = useState("");

	const canModerate = detail.moderationProblem === null;
	const problem = warningProblem(reason);

	function cancel(): void {
		setConfirming(false);
		setTyped("");
	}

	return (
		<Card className="flex flex-col gap-4">
			<div>
				<h2 className={CARD_HEADING}>Warnings</h2>
				<p className="text-muted-foreground text-sm">{warningSummary(detail.warnings)}</p>
			</div>

			{!canModerate && <Warning>{detail.moderationProblem}</Warning>}

			{detail.warnings.length > 0 && (
				<WarningList warnings={detail.warnings} busy={busy} canModerate={canModerate} onRemove={onRemove} />
			)}

			{canModerate && (
				<>
					<Field label="Issue a warning" hint="They are not notified from here." htmlFor="warn-reason">
						<input
							id="warn-reason"
							className={FIELD}
							value={reason}
							maxLength={WARNING_LIMITS.maxReason}
							placeholder="Why are they being warned?"
							onChange={(event) => {
								setReason(event.target.value);
							}}
						/>
					</Field>

					<div className="flex flex-wrap items-center gap-3">
						<Button
							disabled={problem !== null || busy}
							onClick={() => {
								onWarn(reason, () => {
									setReason("");
								});
							}}
						>
							Add warning
						</Button>

						{detail.warnings.length > 0 && !confirming && (
							<Button
								variant="ghost"
								disabled={busy}
								onClick={() => {
									setConfirming(true);
								}}
							>
								<Trash2 size={16} aria-hidden="true" /> Clear every warning
							</Button>
						)}
					</div>

					{confirming && (
						<div className="border-destructive/40 flex flex-col gap-3 rounded-lg border p-4">
							<Field label={`Type ${detail.username} to clear every warning`} htmlFor="clear-confirm">
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
							<Warning>This deletes the whole record. It cannot be undone.</Warning>

							<div className="flex flex-wrap gap-3">
								<Button
									variant="destructive"
									disabled={!clearConfirmed(typed, detail) || busy}
									onClick={() => {
										onClear(cancel);
									}}
								>
									Clear every warning
								</Button>
								<Button variant="ghost" onClick={cancel}>
									Cancel
								</Button>
							</div>
						</div>
					)}
				</>
			)}
		</Card>
	);
}
