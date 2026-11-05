import { type MemberDetail, MEMBER_TIMEOUT_MINUTES, WARNING_LIMITS, warningProblem } from "@testify/shared";
import { Timer } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Field, RowActions, SettingRows, Warning } from "@/components/form";
import { FIELD, SELECT } from "@/components/form/fieldStyles";
import { Button } from "@/components/primitives";
import { durationText } from "@/features/cases/cases.utils";
import { clearConfirmed } from "@/features/members/memberDetail.utils";
import { cn } from "@/lib/cn";
import { dateAndTime } from "@/lib/datetime";
import { problemText } from "@/lib/problemText";
import { sanitiseInput } from "@/lib/sanitise";

type Minutes = (typeof MEMBER_TIMEOUT_MINUTES)[number];

export function TimeoutCard({
	detail,
	busy,
	onTimeout,
	onLift,
}: {
	detail: MemberDetail;
	busy: boolean;
	onTimeout: (minutes: Minutes, reason: string, confirm: string) => void;
	onLift: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const [minutes, setMinutes] = useState<Minutes>(60);
	const [reason, setReason] = useState("");
	const [typed, setTyped] = useState("");

	const problem = problemText(warningProblem(reason), t);
	const ready = problem === null && clearConfirmed(typed, detail) && !busy;

	function close(): void {
		setOpen(false);
		setReason("");
		setTyped("");
		setMinutes(60);
	}

	return (
		<SettingRows
			title={t("members.timeoutTitle")}
			description={
				detail.timedOutUntil === null ? (
					t("members.timeoutBody")
				) : (
					<>
						{t("members.timedOutUntil")}{" "}
						<time dateTime={detail.timedOutUntil}>{dateAndTime(detail.timedOutUntil)}</time>
					</>
				)
			}
		>
			{detail.timedOutUntil !== null ? (
				<RowActions>
					<Button variant="secondary" disabled={busy} onClick={onLift}>
						{t("members.liftTimeout")}
					</Button>
				</RowActions>
			) : !open ? (
				<RowActions>
					<Button
						variant="secondary"
						disabled={busy}
						onClick={() => {
							setOpen(true);
						}}
					>
						<Timer size={16} aria-hidden="true" /> {t("members.timeOut")}
					</Button>
				</RowActions>
			) : (
				<>
					<Field label={t("members.timeoutLength")} htmlFor="timeout-length">
						<select
							id="timeout-length"
							className={cn(SELECT, "max-w-64")}
							value={minutes}
							onChange={(event) => {
								const chosen = MEMBER_TIMEOUT_MINUTES.find((entry) => entry === Number(event.target.value));
								if (chosen !== undefined) setMinutes(chosen);
							}}
						>
							{MEMBER_TIMEOUT_MINUTES.map((entry) => (
								<option key={entry} value={entry}>
									{durationText(entry * 60_000)}
								</option>
							))}
						</select>
					</Field>

					<Field label={t("members.sanctionReason")} htmlFor="timeout-reason">
						<input
							id="timeout-reason"
							className={FIELD}
							value={reason}
							maxLength={WARNING_LIMITS.maxReason}
							onChange={(event) => {
								setReason(event.target.value);
							}}
						/>
					</Field>

					<Field
						label={t("members.typeToConfirm", { name: detail.username })}
						hint={t("members.confirmHint")}
						htmlFor="timeout-confirm"
					>
						<input
							id="timeout-confirm"
							className={FIELD}
							value={typed}
							autoComplete="off"
							onChange={(event) => {
								setTyped(event.target.value);
							}}
						/>
					</Field>

					<Warning>{t("members.timeoutWarning")}</Warning>

					<RowActions>
						<Button
							variant="destructive"
							disabled={!ready}
							onClick={() => {
								onTimeout(minutes, sanitiseInput(reason), typed);
								close();
							}}
						>
							{t("members.timeoutConfirm")}
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
