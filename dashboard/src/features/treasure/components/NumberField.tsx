import { Field, FIELD } from "@/components/form";
import { cn } from "@/lib/cn";

export function NumberField({
	id,
	label,
	value,
	min,
	max,
	hint,
	onChange,
}: {
	id: string;
	label: string;
	value: number;
	min: number;
	max: number;
	hint?: string;
	onChange: (value: number) => void;
}): React.JSX.Element {
	return (
		<Field label={label} htmlFor={id} {...(hint === undefined ? {} : { hint })}>
			<input
				id={id}
				type="number"
				inputMode="numeric"
				min={min}
				max={max}
				value={value}
				onChange={(event) => {
					onChange(Number(event.target.value));
				}}
				className={cn(FIELD, "max-w-40 tabular-nums")}
			/>
		</Field>
	);
}
