import { type MemberMatch, WARNING_LIMITS, warningProblem } from "@testify/shared";
import { X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Field, FieldGroup, RowActions, SettingRows, Warning } from "@/components/form";
import { FIELD } from "@/components/form/fieldStyles";
import { Avatar, Button, DividedList } from "@/components/primitives";
import { useAddWarning, useMemberSearch } from "@/features/warnings/useWarnings";
import { outcomeText } from "@/features/warnings/warnings.utils";
import { useDebounced } from "@/hooks/useDebounced";
import { ApiError } from "@/lib/api";
import { problemText } from "@/lib/problemText";
import { sanitiseInput } from "@/lib/sanitise";

export function WarnMemberCard({ guildId }: { guildId: string }): React.JSX.Element {
	const { t } = useTranslation();
	const [query, setQuery] = useState("");
	const [chosen, setChosen] = useState<MemberMatch | null>(null);
	const [reason, setReason] = useState("");
	const [result, setResult] = useState<string | null>(null);

	const searched = useDebounced(query);
	const search = useMemberSearch(guildId, chosen === null ? searched : "");
	const add = useAddWarning(guildId);
	const problem = problemText(warningProblem(reason), t);

	return (
		<SettingRows title={t("warnings.warnTitle")} description={t("warnings.warnBody")}>
			{chosen === null ? (
				<Field label={t("warnings.findMember")} hint={t("warnings.findHint")} htmlFor="warn-find">
					<input
						id="warn-find"
						className={FIELD}
						value={query}
						autoComplete="off"
						maxLength={32}
						onChange={(event) => {
							setQuery(event.target.value);
						}}
					/>
					{searched.trim() !== "" && (
						<div aria-live="polite">
							{search.isPending ? (
								<p className="text-muted-foreground text-sm">{t("warnings.searching")}</p>
							) : search.isError ? (
								<Warning>{t("warnings.searchFailed")}</Warning>
							) : search.data.length === 0 ? (
								<p className="text-muted-foreground text-sm">{t("warnings.noMatches")}</p>
							) : (
								<DividedList>
									{search.data.map((match) => (
										<li key={match.userId}>
											<button
												type="button"
												className="hover:bg-muted flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors duration-150"
												onClick={() => {
													setChosen(match);
													setResult(null);
												}}
											>
												<Avatar name={match.displayName} url={match.avatarUrl} size={24} seed={match.userId} />
												<span className="truncate font-medium">{match.displayName}</span>
												<span className="text-muted-foreground truncate">@{match.username}</span>
											</button>
										</li>
									))}
								</DividedList>
							)}
						</div>
					)}
				</Field>
			) : (
				<FieldGroup label={t("warnings.findMember")} named={false}>
					<div className="flex items-center gap-3">
						<Avatar name={chosen.displayName} url={chosen.avatarUrl} size={32} seed={chosen.userId} />
						<p className="min-w-0 flex-1 truncate text-sm">
							<span className="font-medium">{chosen.displayName}</span>{" "}
							<span className="text-muted-foreground">@{chosen.username}</span>
						</p>
						<Button
							variant="ghost"
							onClick={() => {
								setChosen(null);
							}}
						>
							<X size={16} aria-hidden="true" /> {t("warnings.change")}
						</Button>
					</div>
				</FieldGroup>
			)}

			<Field label={t("warnings.reason")} htmlFor="warn-reason-new">
				<input
					id="warn-reason-new"
					className={FIELD}
					value={reason}
					maxLength={WARNING_LIMITS.maxReason}
					placeholder={t("members.reasonPlaceholder")}
					onChange={(event) => {
						setReason(event.target.value);
					}}
				/>
			</Field>

			{add.error !== null && (
				<Warning>{add.error instanceof ApiError ? add.error.message : t("common.couldNotSave")}</Warning>
			)}

			<RowActions>
				<Button
					disabled={chosen === null || problem !== null || add.isPending}
					onClick={() => {
						if (chosen === null) return;
						add.mutate(
							{ userId: chosen.userId, reason: sanitiseInput(reason) },
							{
								onSuccess: (added) => {
									setResult(`${chosen.displayName}: ${outcomeText(added.outcome, t)}`);
									setReason("");
									setQuery("");
									setChosen(null);
								},
							},
						);
					}}
				>
					{t("warnings.warnAction")}
				</Button>
				<p role="status" className="text-sm">
					{result}
				</p>
			</RowActions>
		</SettingRows>
	);
}
