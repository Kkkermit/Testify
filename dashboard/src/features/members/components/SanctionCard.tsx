import { type MemberDetail, type ReaderPermission, WARN_LIMITS, WARNING_LIMITS, warningProblem } from "@testify/shared";
import { Ban, DoorOpen } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmField, Field, RowActions, SettingRows, Warning } from "@/components/form";
import { FIELD, SELECT } from "@/components/form/fieldStyles";
import { Button } from "@/components/primitives";
import { NeedsPermission } from "@/features/guild-overview/components/NeedsPermission";
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
	missing,
}: {
	detail: MemberDetail;
	busy: boolean;
	/** The reader's own permissions this card asks for and they do not hold. */
	missing: ReaderPermission[];
	onKick: (reason: string, confirm: string) => void;
	onBan: (reason: string, confirm: string, deleteDays: number) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [chosen, setChosen] = useState<Sanction | null>(null);
	const [reason, setReason] = useState("");
	const [typed, setTyped] = useState("");
	const [deleteDays, setDeleteDays] = useState(0);

	const canKick = detail.moderationProblem === null;
	const mayKick = canKick && !missing.includes("KickMembers");
	const mayBan = !missing.includes("BanMembers");
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
				<>
					{(mayKick || mayBan) && (
						<RowActions>
							{mayKick && (
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
							{mayBan && (
								<Button
									variant="destructive"
									disabled={busy}
									onClick={() => {
										setChosen("ban");
									}}
								>
									<Ban size={16} aria-hidden="true" /> {t("members.ban")}
								</Button>
							)}
						</RowActions>
					)}
					{canKick && missing.includes("KickMembers") && <NeedsPermission permission="KickMembers" />}
					{missing.includes("BanMembers") && <NeedsPermission permission="BanMembers" />}
				</>
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

					<ConfirmField
						id="sanction-confirm"
						label={t("members.typeToConfirm", { name: detail.username })}
						hint={t("members.confirmHint")}
						value={typed}
						onChange={setTyped}
					/>

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
