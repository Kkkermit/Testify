import { type MemberDetail, WARN_LIMITS, WARNING_LIMITS, warningProblem } from "@testify/shared";
import { Ban, DoorOpen } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Field, RowActions, SettingRows, Warning } from "@/components/form";
import { FIELD, SELECT } from "@/components/form/fieldStyles";
import { Button } from "@/components/primitives";
import { clearConfirmed } from "@/features/members/memberDetail.utils";
import { cn } from "@/lib/cn";
import { problemText } from "@/lib/problemText";
import { sanitiseInput } from "@/lib/sanitise";

type Sanction = "kick" | "ban";

const DELETE_DAYS = Array.from({ length: WARN_LIMITS.maxDeleteDays + 1 }, (_, days) => days);

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
		<SettingRows
			title={t("members.sanctionTitle")}
			description={canKick ? t("members.sanctionBody") : t("members.sanctionBanOnly")}
		>
			{chosen === null ? (
				<RowActions>
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
				</RowActions>
			) : (
				<>
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
								className={cn(SELECT, "max-w-64")}
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

					<RowActions>
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
					</RowActions>
				</>
			)}
		</SettingRows>
	);
}
