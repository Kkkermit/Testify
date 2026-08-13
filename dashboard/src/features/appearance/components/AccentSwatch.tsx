import { Check } from "lucide-react";
import { type Accent } from "@/hooks/useAccent";
import { cn } from "@/lib/cn";

/**
 * `data-accent` on the tile makes every token inside it resolve to that accent, so each swatch paints itself
 * from `index.css` — including its own focus ring — and nothing here names a colour.
 */
export function AccentSwatch({
	accent,
	label,
	selected,
	onSelect,
}: {
	accent: Accent;
	label: string;
	selected: boolean;
	onSelect: (next: Accent) => void;
}): React.JSX.Element {
	return (
		<button
			type="button"
			data-accent={accent}
			aria-pressed={selected}
			onClick={() => {
				onSelect(accent);
			}}
			className={cn(
				"rounded-card group flex w-full items-center gap-3 border px-3 py-2 text-sm transition-colors duration-150",
				"focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
				selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted",
			)}
		>
			<span className="bg-primary flex size-6 shrink-0 items-center justify-center rounded-full">
				{selected ? <Check size={14} className="text-primary-foreground" aria-hidden="true" /> : null}
			</span>
			<span className={selected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}>
				{label}
			</span>
		</button>
	);
}
