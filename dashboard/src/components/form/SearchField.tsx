import { Search } from "lucide-react";
import { FIELD } from "@/components/form/fieldStyles";
import { cn } from "@/lib/cn";

/**
 * A search box with the magnifier inside it.
 *
 * The name is `sr-only` rather than absent: the icon is decoration, and a box labelled only by a placeholder
 * loses its name the moment somebody types in it.
 */
export function SearchField({
	label,
	placeholder,
	value,
	onChange,
	className,
	autoFocus = false,
}: {
	label: string;
	placeholder: string;
	value: string;
	onChange: (value: string) => void;
	className?: string;
	autoFocus?: boolean;
}): React.JSX.Element {
	return (
		<label className={cn("relative block", className)}>
			<span className="sr-only">{label}</span>
			<Search
				size={16}
				aria-hidden="true"
				className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
			/>
			<input
				type="search"
				autoFocus={autoFocus}
				value={value}
				placeholder={placeholder}
				onChange={(event) => {
					onChange(event.target.value);
				}}
				className={cn(FIELD, "pl-9")}
			/>
		</label>
	);
}
