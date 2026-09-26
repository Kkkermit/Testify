import { type MemberWarning, WARNING_LIMITS, warningProblem } from "@testify/shared";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { FIELD } from "@/components/form/fieldStyles";
import { Badge, Button } from "@/components/primitives";
import { shortDate } from "@/lib/datetime";
import { problemText } from "@/lib/problemText";
import { sanitiseInput } from "@/lib/sanitise";

/** One warning with its own Edit and Remove, shared by the server's list and a member's page. */
export function WarningRow({
	warning,
	member,
	canChange,
	busy,
	onEdit,
	onRemove,
}: {
	warning: MemberWarning;
	/** Set on the server-wide list, where the row has to say whose warning it is. */
	member?: { name: string; href: string };
	canChange: boolean;
	busy: boolean;
	onEdit: (reason: string, done: () => void) => void;
	onRemove: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [draft, setDraft] = useState<string | null>(null);
	const problem = draft === null ? null : problemText(warningProblem(draft), t);
	const fieldId = `warning-${warning.id}`;

	return (
		<li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				{member !== undefined && (
					<Link to={member.href} className="hover:text-accent w-fit text-sm font-medium transition-colors duration-150">
						{member.name}
					</Link>
				)}

				{draft === null ? (
					<p className="text-sm break-words">{warning.reason}</p>
				) : (
					<div className="flex flex-col gap-2">
						<label htmlFor={fieldId} className="sr-only">
							{t("warnings.newReason")}
						</label>
						<input
							id={fieldId}
							className={FIELD}
							value={draft}
							maxLength={WARNING_LIMITS.maxReason}
							onChange={(event) => {
								setDraft(event.target.value);
							}}
						/>
						{problem !== null && <p className="text-destructive text-xs">{problem}</p>}
					</div>
				)}

				<p className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
					<span>
						{t("warnings.givenBy", { name: warning.byTag })} ·{" "}
						<time dateTime={warning.at}>{shortDate(warning.at)}</time>
					</span>
					{warning.edited && <Badge tone="warning">{t("members.edited")}</Badge>}
				</p>
			</div>

			{canChange && (
				<div className="flex shrink-0 flex-wrap gap-2">
					{draft === null ? (
						<>
							<Button
								variant="ghost"
								disabled={busy}
								onClick={() => {
									setDraft(warning.reason);
								}}
							>
								<Pencil size={16} aria-hidden="true" /> {t("warnings.edit")}
							</Button>
							<Button variant="ghost" disabled={busy} onClick={onRemove}>
								<Trash2 size={16} aria-hidden="true" /> {t("warnings.remove")}
							</Button>
						</>
					) : (
						<>
							<Button
								disabled={busy || problem !== null || draft.trim() === warning.reason}
								onClick={() => {
									onEdit(sanitiseInput(draft), () => {
										setDraft(null);
									});
								}}
							>
								{t("common.save")}
							</Button>
							<Button
								variant="ghost"
								onClick={() => {
									setDraft(null);
								}}
							>
								{t("common.cancel")}
							</Button>
						</>
					)}
				</div>
			)}
		</li>
	);
}
