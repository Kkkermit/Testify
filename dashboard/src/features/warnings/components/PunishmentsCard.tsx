import { stepFromValue, stepValue, WARN_LIMITS, type WarnStep } from "@testify/shared";
import { Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/app/ErrorState";
import { Field, RowActions, SettingRows, Warning } from "@/components/form";
import { SELECT } from "@/components/form/fieldStyles";
import { Button, Skeleton } from "@/components/primitives";
import { usePunishments, useSavePunishments } from "@/features/warnings/useWarnings";
import { addStep, replaceStep, STEP_OPTIONS, stepText } from "@/features/warnings/warnings.utils";
import { ApiError } from "@/lib/api";

export function PunishmentsCard({ guildId }: { guildId: string }): React.JSX.Element {
	const { t } = useTranslation();
	const punishments = usePunishments(guildId);
	const save = useSavePunishments(guildId);

	return (
		<SettingRows title={t("warnings.punishmentsTitle")} description={t("warnings.punishmentsBody")}>
			{punishments.isError ? (
				<ErrorState as="h2" error={punishments.error} onRetry={() => void punishments.refetch()} />
			) : punishments.isPending ? (
				<Skeleton className="h-40 w-full" />
			) : (
				<PunishmentSteps
					steps={save.isPending ? save.variables : punishments.data.steps}
					busy={save.isPending}
					onChange={(steps) => {
						save.mutate(steps);
					}}
				/>
			)}

			{save.error !== null && (
				<Warning>{save.error instanceof ApiError ? save.error.message : t("common.couldNotSave")}</Warning>
			)}
		</SettingRows>
	);
}

function PunishmentSteps({
	steps,
	busy,
	onChange,
}: {
	steps: readonly WarnStep[];
	busy: boolean;
	onChange: (steps: WarnStep[]) => void;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<>
			{steps.length === 0 ? (
				<p className="text-sm">{t("warnings.noPunishments")}</p>
			) : (
				steps.map((step, index) => {
					const id = `punishment-${String(index)}`;
					return (
						// A step has no identity but its position.
						<Field key={index} label={t("warnings.warningNumber", { count: index + 1 })} htmlFor={id}>
							<select
								id={id}
								className={SELECT}
								value={stepValue(step)}
								disabled={busy}
								onChange={(event) => {
									const chosen = stepFromValue(event.target.value);
									if (chosen !== null) onChange(replaceStep(steps, index, chosen));
								}}
							>
								{STEP_OPTIONS.map((choice) => (
									<option key={choice.value} value={choice.value}>
										{stepText(choice.step, t)}
									</option>
								))}
							</select>
						</Field>
					);
				})
			)}

			<RowActions>
				<Button
					variant="secondary"
					disabled={busy || steps.length >= WARN_LIMITS.maxSteps}
					onClick={() => {
						onChange(addStep(steps));
					}}
				>
					<Plus size={16} aria-hidden="true" /> {t("warnings.addStep")}
				</Button>
				<Button
					variant="ghost"
					disabled={busy || steps.length === 0}
					onClick={() => {
						onChange(steps.slice(0, -1));
					}}
				>
					<Minus size={16} aria-hidden="true" /> {t("warnings.removeStep")}
				</Button>
			</RowActions>

			<p className="text-muted-foreground text-xs">{t("warnings.punishmentsNote")}</p>
		</>
	);
}
