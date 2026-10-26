import { type MemberDetail, MEMBER_TIMEOUT_MINUTES, WARNING_LIMITS, warningProblem } from "@testify/shared";
import { Timer } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Field, Warning } from "@/components/form";
import { FIELD, SELECT } from "@/components/form/fieldStyles";
import { Button, Card, CARD_HEADING } from "@/components/primitives";
import { durationText } from "@/features/cases/cases.utils";
import { clearConfirmed } from "@/features/members/memberDetail.utils";
import { dateAndTime } from "@/lib/datetime";
import { problemText } from "@/lib/problemText";
import { sanitiseInput } from "@/lib/sanitise";

type Minutes = (typeof MEMBER_TIMEOUT_MINUTES)[number];

/** A timeout behind the username typed back, like a kick; lifting one early needs nothing but the press. */
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
	const { t, i18n } = useTranslation();
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
		<Card className="flex flex-col gap-4">
			<div>
				<h2 className={CARD_HEADING}>{t("members.timeoutTitle")}</h2>
				<p className="text-muted-foreground text-sm">
					{detail.timedOutUntil === null ? (
						t("members.timeoutBody")
					) : (
						<>
							{t("members.timedOutUntil")}{" "}
							<time dateTime={detail.timedOutUntil}>{dateAndTime(detail.timedOutUntil)}</time>
						</>
					)}
				</p>
			</div>

			{detail.timedOutUntil !== null ? (
				<Button variant="secondary" className="w-fit" disabled={busy} onClick={onLift}>
					{t("members.liftTimeout")}
				</Button>
			) : !open ? (
				<Button
					variant="secondary"
					className="w-fit"
					disabled={busy}
					onClick={() => {
						setOpen(true);
					}}
				>
					<Timer size={16} aria-hidden="true" /> {t("members.timeOut")}
				</Button>
			) : (
				<div className="border-destructive/40 flex flex-col gap-3 rounded-field border p-4">
					<Field label={t("members.timeoutLength")} htmlFor="timeout-length">
						<select
							id="timeout-length"
							className={SELECT}
							value={minutes}
							onChange={(event) => {
								const chosen = MEMBER_TIMEOUT_MINUTES.find((entry) => entry === Number(event.target.value));
								if (chosen !== undefined) setMinutes(chosen);
							}}
						>
							{MEMBER_TIMEOUT_MINUTES.map((entry) => (
								<option key={entry} value={entry}>
									{durationText(entry * 60_000, i18n.language)}
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

					<div className="flex flex-wrap gap-3">
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
					</div>
				</div>
			)}
		</Card>
	);
}
