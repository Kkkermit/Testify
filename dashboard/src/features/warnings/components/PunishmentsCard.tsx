import { expiryOf, stepFromValue, stepValue, WARN_LIMITS, type WarnLadder, type WarnStep } from "@testify/shared";
import { Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/app/ErrorState";
import { Field, Refusal, RowActions, SettingRows } from "@/components/form";
import { SELECT } from "@/components/form/fieldStyles";
import { Button, Skeleton } from "@/components/primitives";
import { usePunishments, useSavePunishments } from "@/features/warnings/useWarnings";
import {
	addStep,
	EXPIRY_OPTIONS,
	expiryText,
	replaceStep,
	STEP_OPTIONS,
	stepText,
} from "@/features/warnings/warnings.utils";

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
				<Ladder
					ladder={save.isPending ? save.variables : punishments.data}
					busy={save.isPending}
					onChange={(ladder) => {
						save.mutate(ladder);
					}}
				/>
			)}

			<Refusal error={save.error} />
		</SettingRows>
	);
}

function Ladder({
	ladder,
	busy,
	onChange,
}: {
	ladder: WarnLadder;
	busy: boolean;
	onChange: (ladder: WarnLadder) => void;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<>
			<PunishmentSteps
				steps={ladder.steps}
				busy={busy}
				onChange={(steps) => {
					onChange({ ...ladder, steps });
				}}
			/>

			<Field label={t("warnings.expiryLabel")} htmlFor="punishment-expiry" hint={t("warnings.expiryHelp")}>
				<select
					id="punishment-expiry"
					className={SELECT}
					value={ladder.expireAfterDays === null ? "never" : String(ladder.expireAfterDays)}
					disabled={busy}
					onChange={(event) => {
						const { value } = event.target;
						onChange({ ...ladder, expireAfterDays: value === "never" ? null : expiryOf(Number(value)) });
					}}
				>
					{EXPIRY_OPTIONS.map((days) => (
						<option key={days ?? "never"} value={days ?? "never"}>
							{expiryText(days, t)}
						</option>
					))}
				</select>
			</Field>
		</>
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
