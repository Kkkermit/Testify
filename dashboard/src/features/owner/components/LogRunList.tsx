import { type LogRun } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { runDetails, runTitle } from "@/features/owner/logs.utils";
import { cn } from "@/lib/cn";

/** Each run the bot keeps logs for, newest first, picked like a radio group so arrow keys move between them. */
export function LogRunList({
	runs,
	kept,
	chosen,
	searching,
	onChoose,
}: {
	runs: LogRun[];
	kept: number;
	/** The id of the run shown; the run going now when null. */
	chosen: string | null;
	searching: boolean;
	onChoose: (run: LogRun) => void;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<fieldset className="flex min-w-0 flex-col gap-2">
			<legend className="text-sm font-medium">{t("owner.runsTitle")}</legend>
			<p className="text-muted-foreground text-xs">{t("owner.runsKept", { kept })}</p>

			<ul className="divide-border border-border rounded-field divide-y border">
				{runs.map((run) => {
					const checked = run.current ? chosen === null : chosen === run.id;
					const details = runDetails(run, t);

					return (
						<li key={run.id}>
							<label
								className={cn(
									"flex cursor-pointer items-start gap-3 px-3 py-2.5 text-sm transition-colors duration-150",
									checked ? "bg-muted" : "hover:bg-muted/60",
								)}
							>
								<input
									type="radio"
									name="log-run"
									className="mt-1"
									checked={checked}
									onChange={() => {
										onChoose(run);
									}}
								/>
								<span className="flex min-w-0 flex-1 flex-col gap-1">
									<span className="flex flex-wrap items-center gap-x-2 gap-y-1">
										<span className="font-medium tabular-nums">{runTitle(run, t)}</span>
										{searching && run.matched !== null && (
											<span
												className={cn("text-xs font-medium", run.matched > 0 ? "text-accent" : "text-muted-foreground")}
											>
												{t("owner.runMatches", { count: run.matched })}
											</span>
										)}
									</span>
									<span className="text-muted-foreground text-xs tabular-nums">
										{details.map((part, index) => (
											<span
												key={part.text}
												className={cn(
													index > 0 && "before:text-muted-foreground before:px-1.5 before:content-['·']",
													part.alarm && "text-destructive-text",
												)}
											>
												{part.text}
											</span>
										))}
									</span>
								</span>
							</label>
						</li>
					);
				})}
			</ul>
		</fieldset>
	);
}
