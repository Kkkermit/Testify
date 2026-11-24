import { planBackup, type RestorableAction, type BackupDocument, type BackupStep } from "@testify/shared";
import { Check } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Refusal, RowActions, Warning } from "@/components/form";
import { Button, DividedList, SectionHeading } from "@/components/primitives";
import { BACKUP_SECTION_LABELS } from "@/features/backup/backup.labels";
import { missingText, sectionList } from "@/features/backup/backup.utils";
import { sectionOn, type ServerSettings, type StepResult } from "@/features/backup/useBackup";
import { useFeaturesOff } from "@/features/site/useFeaturesOff";
import { dateAndTime } from "@/lib/datetime";

export interface Incoming {
	document: BackupDocument;
	here: ServerSettings;
}

/** What bringing a backup in would change, section by section, each ticked unless it is already the same here. */
export function BackupPreview({
	incoming,
	busy,
	results,
	onApply,
}: {
	incoming: Incoming;
	busy: boolean;
	results: readonly StepResult[];
	onApply: (steps: BackupStep[]) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const { document, here } = incoming;
	const featuresOff = useFeaturesOff();
	const full = planBackup(document, here, here.reads);
	const plan = { ...full, steps: full.steps.filter((step) => sectionOn(step.action, featuresOff)) };
	const [skipped, setSkipped] = useState<ReadonlySet<RestorableAction>>(
		() => new Set(plan.steps.filter((step) => step.unchanged).map((step) => step.action)),
	);
	const chosen = plan.steps.filter((step) => !skipped.has(step.action));
	const resultOf = (action: RestorableAction): StepResult | undefined =>
		results.find((result) => result.action === action);

	return (
		<section aria-labelledby="backup-preview" className="flex flex-col gap-3">
			<SectionHeading as="h2" id="backup-preview" count={plan.steps.length}>
				{t("backup.previewTitle", { name: document.guildName })}
			</SectionHeading>
			<p className="text-muted-foreground text-sm">
				{t("backup.previewBody", { time: dateAndTime(document.exportedAt) })}
			</p>

			{plan.steps.length === 0 ? (
				<p className="text-sm">{t("backup.nothing")}</p>
			) : (
				<DividedList>
					{plan.steps.map((step) => {
						const result = resultOf(step.action);
						const id = `backup-${step.action}`;
						return (
							<li key={step.action} className="flex flex-col gap-1 px-4 py-3">
								<label htmlFor={id} className="flex items-center gap-3 text-sm font-medium">
									<input
										id={id}
										type="checkbox"
										checked={!skipped.has(step.action)}
										disabled={busy}
										onChange={(event) => {
											const next = new Set(skipped);
											if (event.target.checked) next.delete(step.action);
											else next.add(step.action);
											setSkipped(next);
										}}
									/>
									{t(BACKUP_SECTION_LABELS[step.action])}
								</label>
								<p className="text-muted-foreground ml-7 text-sm">
									{step.unchanged ? t("backup.same") : t("backup.changes", { count: Object.keys(step.body).length })}
								</p>
								{step.missing.map((missing) => (
									<p key={`${missing.kind}:${missing.name ?? ""}`} className="text-warning ml-7 text-sm">
										{missingText(missing, t)}
									</p>
								))}
								{result?.ok === true && (
									<p className="text-success ml-7 flex items-center gap-1 text-sm">
										<Check size={14} aria-hidden="true" />
										{t("backup.saved")}
									</p>
								)}
								{result?.ok === false && (
									<div className="ml-7">
										<Refusal error={result.error} />
									</div>
								)}
							</li>
						);
					})}
				</DividedList>
			)}

			{plan.left.map(({ action, missing }) => (
				<Warning key={action}>
					{[
						t("backup.leftAsIs", { section: t(BACKUP_SECTION_LABELS[action]) }),
						...missing.map((entry) => missingText(entry, t)),
					].join(t("common.sentenceSeparator"))}
				</Warning>
			))}

			{plan.unusable.length > 0 && (
				<Warning>
					{t("backup.unusable", {
						sections: sectionList(plan.unusable, t),
					})}
				</Warning>
			)}

			<RowActions>
				<Button
					disabled={busy || chosen.length === 0}
					onClick={() => {
						onApply(chosen);
					}}
				>
					{t("backup.apply", { count: chosen.length })}
				</Button>
			</RowActions>
		</section>
	);
}
