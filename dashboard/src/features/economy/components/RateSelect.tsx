import { type TuningRate, TUNING_RATES } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Field, SELECT } from "@/components/form";
import { formatPercent } from "@/lib/intl";

/** A rate as a percentage of the bot's own; 100% is marked as the usual. */
export function RateSelect({
	id,
	label,
	hint,
	value,
	disabled,
	onChange,
}: {
	id: string;
	label: string;
	hint: string;
	value: TuningRate;
	disabled: boolean;
	onChange: (rate: TuningRate) => void;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<Field label={label} htmlFor={id} hint={hint}>
			<select
				id={id}
				className={SELECT}
				value={String(value)}
				disabled={disabled}
				onChange={(event) => {
					const rate = TUNING_RATES.find((choice) => String(choice) === event.target.value);
					if (rate !== undefined) onChange(rate);
				}}
			>
				{TUNING_RATES.map((rate) => (
					<option key={rate} value={rate}>
						{rate === 100 ? t("economy.usualRate", { rate: formatPercent(rate, 100) }) : formatPercent(rate, 100)}
					</option>
				))}
			</select>
		</Field>
	);
}
