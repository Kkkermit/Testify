import { Field } from "@/components/form/Field";
import { FIELD } from "@/components/form/fieldStyles";

/** The name typed back before a destructive action, which the server compares again. */
export function ConfirmField({
	id,
	label,
	hint,
	value,
	onChange,
}: {
	id: string;
	label: string;
	hint: string;
	value: string;
	onChange: (value: string) => void;
}): React.JSX.Element {
	return (
		<Field label={label} hint={hint} htmlFor={id}>
			<input
				id={id}
				className={FIELD}
				value={value}
				autoComplete="off"
				onChange={(event) => {
					onChange(event.target.value);
				}}
			/>
		</Field>
	);
}
