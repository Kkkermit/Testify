import { cn } from "@/lib/cn";

/** One radio of a group, drawn as a card with a line of description; `name` keeps two groups on one page apart. */
export function RadioCard({
	name,
	label,
	description,
	checked,
	disabled = false,
	onChange,
}: {
	name: string;
	label: string;
	description: string;
	checked: boolean;
	disabled?: boolean;
	onChange: () => void;
}): React.JSX.Element {
	return (
		<label
			className={cn(
				"rounded-card flex flex-col gap-1 border p-3 transition-colors duration-150",
				disabled ? "border-border opacity-50" : "cursor-pointer",
				checked ? "border-primary bg-primary/10" : !disabled && "border-border hover:border-input",
			)}
		>
			<span className="flex items-center gap-2">
				<input type="radio" name={name} checked={checked} disabled={disabled} onChange={onChange} />
				<span className="text-sm font-medium">{label}</span>
			</span>
			<span className="text-muted-foreground text-xs">{description}</span>
		</label>
	);
}
