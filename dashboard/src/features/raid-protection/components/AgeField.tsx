import { RAID_LIMITS } from "@testify/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FIELD, Field, SELECT, Warning } from "@/components/form";
import { ageMinutes, ageParts, ageText, AGE_UNITS, type AgeUnit } from "@/features/raid-protection/raid.utils";
import { type TranslationKey } from "@/i18n";
import { cn } from "@/lib/cn";
import { oneOf } from "@/lib/oneOf";

const UNITS = Object.keys(AGE_UNITS) as AgeUnit[];

const UNIT_LABELS: Record<AgeUnit, TranslationKey> = {
	minutes: "raid.unitMinutes",
	hours: "raid.unitHours",
	days: "raid.unitDays",
};

/** A number and the unit it counts in, saved together once focus leaves both; keyed by the stored value. */
export function AgeField({ stored, onSave }: { stored: number; onSave: (minutes: number) => void }): React.JSX.Element {
	const { t } = useTranslation();
	const start = ageParts(stored);
	const [text, setText] = useState(String(start.value));
	const [unit, setUnit] = useState<AgeUnit>(start.unit);
	const minutes = ageMinutes(text, unit);
	const longest = ageText(RAID_LIMITS.maxAccountAgeMinutes);

	return (
		<Field label={t("raid.minAge")} htmlFor="raid-age" hint={t("raid.minAgeHint", { max: longest })}>
			<div
				className="flex flex-wrap items-center gap-2"
				onBlur={(event) => {
					// Moving from the number to its unit is still choosing; leaving both is when it is saved.
					if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
					if (minutes !== null && minutes !== stored) onSave(minutes);
				}}
			>
				<input
					id="raid-age"
					inputMode="numeric"
					value={text}
					aria-invalid={minutes === null}
					onChange={(event) => {
						setText(event.target.value);
					}}
					className={cn(FIELD, "max-w-28 font-mono tabular-nums", minutes === null && "border-destructive")}
				/>
				<select
					aria-label={t("raid.ageUnit")}
					className={cn(SELECT, "w-auto")}
					value={unit}
					onChange={(event) => {
						setUnit(oneOf(UNITS, event.target.value, unit));
					}}
				>
					{UNITS.map((option) => (
						<option key={option} value={option}>
							{t(UNIT_LABELS[option])}
						</option>
					))}
				</select>
			</div>
			{minutes === null && <Warning>{t("raid.ageOutOfRange", { max: longest })}</Warning>}
		</Field>
	);
}
