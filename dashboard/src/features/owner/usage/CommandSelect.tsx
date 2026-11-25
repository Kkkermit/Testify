import { useId } from "react";
import { useTranslation } from "react-i18next";
import { LABEL, SELECT } from "@/components/form";

export function CommandSelect({
	label,
	value,
	names,
	onChange,
	anything,
}: {
	label: string;
	value: string | null;
	names: string[];
	onChange: (name: string | null) => void;
	anything?: string;
}): React.JSX.Element {
	const id = useId();
	const { t } = useTranslation();

	return (
		<div className="flex min-w-0 flex-col gap-1">
			<label htmlFor={id} className={LABEL}>
				{label}
			</label>
			<select
				id={id}
				className={SELECT}
				value={value ?? ""}
				onChange={(event) => {
					onChange(event.target.value === "" ? null : event.target.value);
				}}
			>
				<option value="" disabled={anything === undefined}>
					{anything ?? t("owner.usageSections.pickCommand")}
				</option>
				{names.map((name) => (
					<option key={name} value={name}>
						/{name}
					</option>
				))}
			</select>
		</div>
	);
}
