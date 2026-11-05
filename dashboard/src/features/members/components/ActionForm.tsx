import {
	type BulkOutcome,
	bulkConfirmed,
	type DirectoryPage,
	type DirectoryRow,
	MEMBER_TIMEOUT_MINUTES,
	WARN_LIMITS,
	WARNING_LIMITS,
	warningProblem,
} from "@testify/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Field, RowActions, Warning } from "@/components/form";
import { FIELD, SELECT } from "@/components/form/fieldStyles";
import { Button, Card, CARD_HEADING } from "@/components/primitives";
import { durationText } from "@/features/cases/cases.utils";
import { ACTION_LABELS, type MemberAction, SKIP_LABELS } from "@/features/members/directory.utils";
import { type BulkRequest, useBulkAction } from "@/features/members/useDirectory";
import { useAddWarning } from "@/features/warnings/useWarnings";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { problemText } from "@/lib/problemText";
import { sanitiseInput } from "@/lib/sanitise";

type Minutes = (typeof MEMBER_TIMEOUT_MINUTES)[number];

const DELETE_DAYS = Array.from({ length: WARN_LIMITS.maxDeleteDays + 1 }, (_, days) => days);

const CONFIRM_LABELS: Record<
	MemberAction,
	| "directory.giveConfirm"
	| "directory.takeConfirm"
	| "members.timeoutConfirm"
	| "directory.warnConfirm"
	| "members.kickConfirm"
	| "members.banConfirm"
> = {
	give: "directory.giveConfirm",
	take: "directory.takeConfirm",
	timeout: "members.timeoutConfirm",
	warn: "directory.warnConfirm",
	kick: "members.kickConfirm",
	ban: "members.banConfirm",
};

function bulkKind(action: MemberAction): "roles" | "timeout" | "kick" | "ban" {
	return action === "give" || action === "take" ? "roles" : action === "warn" ? "timeout" : action;
}

/** One form for an action on one member from their row, or on everybody ticked; the server checks it all again. */
export function ActionForm({
	guildId,
	action,
	targets,
	page,
	onClose,
}: {
	guildId: string;
	action: MemberAction;
	targets: readonly DirectoryRow[];
	page: DirectoryPage;
	onClose: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const bulk = useBulkAction(guildId);
	const warn = useAddWarning(guildId);
	const [roleId, setRoleId] = useState(page.grantable[0] ?? "");
	const [minutes, setMinutes] = useState<Minutes>(60);
	const [reason, setReason] = useState("");
	const [deleteDays, setDeleteDays] = useState(0);
	const [typed, setTyped] = useState("");
	const [outcomes, setOutcomes] = useState<BulkOutcome[] | null>(null);

	const roles = action === "give" || action === "take";
	const id = `member-action-${action}`;
	const names = targets.map((row) => row.displayName).join(t("common.listSeparator"));
	const [only] = targets;
	const typing =
		roles || (action === "timeout" && targets.length > 1) || action === "warn"
			? null
			: targets.length === 1 && only !== undefined
				? only.username
				: String(targets.length);
	const problem = roles ? null : problemText(warningProblem(reason), t);
	const busy = bulk.isPending || warn.isPending;
	const confirmed =
		action === "warn" ||
		bulkConfirmed(
			bulkKind(action),
			typed,
			targets.map(({ userId, username }) => ({ userId, username })),
		);
	const ready = !busy && problem === null && confirmed && (!roles || roleId !== "");
	const failure = bulk.error ?? warn.error;

	function request(): BulkRequest | null {
		const userIds = targets.map((row) => row.userId);
		const why = sanitiseInput(reason);
		if (roles) return { kind: "roles", body: { userIds, roleId, give: action === "give" } };
		if (action === "timeout") return { kind: "timeout", body: { userIds, minutes, reason: why, confirm: typed } };
		if (action === "kick") return { kind: "kick", body: { userIds, reason: why, confirm: typed } };
		if (action === "ban") return { kind: "ban", body: { userIds, reason: why, confirm: typed, deleteDays } };
		return null;
	}

	function submit(): void {
		const asked = request();
		if (asked !== null) {
			bulk.mutate(asked, {
				onSuccess: (result) => {
					setOutcomes(result.outcomes);
				},
			});
			return;
		}
		if (only === undefined) return;
		warn.mutate(
			{ userId: only.userId, reason: sanitiseInput(reason) },
			{
				onSuccess: () => {
					setOutcomes([{ userId: only.userId, username: only.username, skipped: null }]);
				},
			},
		);
	}

	const heading = `${id}-heading`;

	return (
		<section aria-labelledby={heading}>
			<Card className="flex flex-col gap-4">
				<div>
					<h3 id={heading} className={CARD_HEADING}>
						{t(ACTION_LABELS[action])}
					</h3>
					<p className="text-muted-foreground text-sm">{t("directory.actingOn", { count: targets.length, names })}</p>
				</div>

				{outcomes !== null ? (
					<>
						<p className="text-sm" role="status">
							{t("directory.resultSummary", {
								done: outcomes.filter((o) => o.skipped === null).length,
								skipped: outcomes.filter((o) => o.skipped !== null).length,
							})}
						</p>
						<ul className="flex flex-col gap-1 text-sm">
							{outcomes.map((outcome) => (
								<li key={outcome.userId} className="flex flex-wrap gap-x-2">
									<span className="font-medium break-all">
										{targets.find((row) => row.userId === outcome.userId)?.displayName ??
											outcome.username ??
											outcome.userId}
									</span>
									<span className={outcome.skipped === null ? "text-success" : "text-muted-foreground"}>
										{outcome.skipped === null ? t("directory.resultDone") : t(SKIP_LABELS[outcome.skipped])}
									</span>
								</li>
							))}
						</ul>
						<RowActions>
							<Button variant="secondary" onClick={onClose}>
								{t("directory.close")}
							</Button>
						</RowActions>
					</>
				) : (
					<>
						{roles &&
							(page.grantable.length === 0 ? (
								<Warning>{t("directory.noGrantable")}</Warning>
							) : (
								<Field label={t("directory.whichRole")} htmlFor={`${id}-role`}>
									<select
										id={`${id}-role`}
										className={cn(SELECT, "max-w-80")}
										value={roleId}
										onChange={(event) => {
											setRoleId(event.target.value);
										}}
									>
										{page.grantable.map((grantable) => (
											<option key={grantable} value={grantable}>
												{page.roles.find((role) => role.id === grantable)?.name ?? grantable}
											</option>
										))}
									</select>
								</Field>
							))}

						{action === "timeout" && (
							<Field label={t("members.timeoutLength")} htmlFor={`${id}-length`}>
								<select
									id={`${id}-length`}
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
						)}

						{!roles && (
							<Field label={t("members.sanctionReason")} htmlFor={`${id}-reason`}>
								<input
									id={`${id}-reason`}
									className={FIELD}
									value={reason}
									maxLength={WARNING_LIMITS.maxReason}
									onChange={(event) => {
										setReason(event.target.value);
									}}
								/>
							</Field>
						)}

						{action === "ban" && (
							<Field label={t("members.deleteDays")} hint={t("members.deleteDaysHint")} htmlFor={`${id}-days`}>
								<select
									id={`${id}-days`}
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

						{typing !== null && (
							<Field
								label={t("members.typeToConfirm", { name: typing })}
								hint={targets.length === 1 ? t("members.confirmHint") : t("directory.typeCountHint")}
								htmlFor={`${id}-confirm`}
							>
								<input
									id={`${id}-confirm`}
									className={FIELD}
									value={typed}
									autoComplete="off"
									onChange={(event) => {
										setTyped(event.target.value);
									}}
								/>
							</Field>
						)}

						{(action === "timeout" || action === "kick" || action === "ban") && (
							<Warning>
								{targets.length === 1
									? t(
											action === "timeout"
												? "members.timeoutWarning"
												: action === "kick"
													? "members.kickWarning"
													: "members.banWarning",
										)
									: t("directory.eachWarning")}
							</Warning>
						)}

						{failure !== null && (
							<Warning>{failure instanceof ApiError ? failure.message : t("common.couldNotSave")}</Warning>
						)}

						<RowActions>
							<Button variant={roles ? "primary" : "destructive"} disabled={!ready} onClick={submit}>
								{busy ? t("directory.working") : t(CONFIRM_LABELS[action])}
							</Button>
							<Button variant="ghost" disabled={busy} onClick={onClose}>
								{t("common.cancel")}
							</Button>
						</RowActions>
					</>
				)}
			</Card>
		</section>
	);
}
