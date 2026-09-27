import { type MemberDetail, WARN_LIMITS, WARNING_LIMITS, warningProblem } from "@testify/shared";
import { Ban, DoorOpen } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Field, Warning } from "@/components/form";
import { FIELD, SELECT } from "@/components/form/fieldStyles";
import { Button, Card, CARD_HEADING } from "@/components/primitives";
import { clearConfirmed } from "@/features/members/memberDetail.utils";
import { problemText } from "@/lib/problemText";
import { sanitiseInput } from "@/lib/sanitise";

type Sanction = "kick" | "ban";

const DELETE_DAYS = Array.from({ length: WARN_LIMITS.maxDeleteDays + 1 }, (_, days) => days);

/** Kick or ban, each behind the member's username typed back, which is what the server checks too. */
export function SanctionCard({
	detail,
	busy,
	onKick,
	onBan,
}: {
	detail: MemberDetail;
	busy: boolean;
	onKick: (reason: string, confirm: string) => void;
	onBan: (reason: string, confirm: string, deleteDays: number) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [chosen, setChosen] = useState<Sanction | null>(null);
	const [reason, setReason] = useState("");
	const [typed, setTyped] = useState("");
	const [deleteDays, setDeleteDays] = useState(0);

	// Somebody who has left can still be banned, which is the one thing a kick cannot reach.
	const canKick = detail.moderationProblem === null;
	const problem = problemText(warningProblem(reason), t);
	const ready = problem === null && clearConfirmed(typed, detail) && !busy;

	function close(): void {
		setChosen(null);
		setReason("");
		setTyped("");
		setDeleteDays(0);
	}

	return (
		<Card className="flex flex-col gap-4">
			<div>
				<h2 className={CARD_HEADING}>{t("members.sanctionTitle")}</h2>
				<p className="text-muted-foreground text-sm">
					{canKick ? t("members.sanctionBody") : t("members.sanctionBanOnly")}
				</p>
			</div>

			{chosen === null ? (
				<div className="flex flex-wrap gap-3">
					{canKick && (
						<Button
							variant="secondary"
							disabled={busy}
							onClick={() => {
								setChosen("kick");
							}}
						>
							<DoorOpen size={16} aria-hidden="true" /> {t("members.kick")}
						</Button>
					)}
					<Button
						variant="destructive"
						disabled={busy}
						onClick={() => {
							setChosen("ban");
						}}
					>
						<Ban size={16} aria-hidden="true" /> {t("members.ban")}
					</Button>
				</div>
			) : (
				<div className="border-destructive/40 flex flex-col gap-3 rounded-field border p-4">
					<Field label={t("members.sanctionReason")} htmlFor="sanction-reason">
						<input
							id="sanction-reason"
							className={FIELD}
							value={reason}
							maxLength={WARNING_LIMITS.maxReason}
							onChange={(event) => {
								setReason(event.target.value);
							}}
						/>
					</Field>

					{chosen === "ban" && (
						<Field label={t("members.deleteDays")} hint={t("members.deleteDaysHint")} htmlFor="sanction-days">
							<select
								id="sanction-days"
								className={SELECT}
								value={deleteDays}
								onChange={(event) => {
									setDeleteDays(Number(event.target.value));
								}}
							>
								{DELETE_DAYS.map((days) => (
									<option key={days} value={days}>
										{days === 0 ? t("members.deleteNone") : t("members.deleteDaysOption", { count: days })}
									</option>
								))}
							</select>
						</Field>
					)}

					<Field
						label={t("members.typeToConfirm", { name: detail.username })}
						hint={t("members.confirmHint")}
						htmlFor="sanction-confirm"
					>
						<input
							id="sanction-confirm"
							className={FIELD}
							value={typed}
							autoComplete="off"
							onChange={(event) => {
								setTyped(event.target.value);
							}}
						/>
					</Field>

					<Warning>{chosen === "kick" ? t("members.kickWarning") : t("members.banWarning")}</Warning>

					<div className="flex flex-wrap gap-3">
						<Button
							variant="destructive"
							disabled={!ready}
							onClick={() => {
								if (chosen === "kick") onKick(sanitiseInput(reason), typed);
								else onBan(sanitiseInput(reason), typed, deleteDays);
								close();
							}}
						>
							{chosen === "kick" ? t("members.kickConfirm") : t("members.banConfirm")}
						</Button>
						<Button variant="ghost" onClick={close}>
							{t("common.cancel")}
						</Button>
					</div>
				</div>
			)}
		</Card>
	);
}
