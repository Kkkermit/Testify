import { type ReactNode } from "react";
import { CHECK_ROW, LABEL, SCROLL_LIST } from "@/components/form/field";
import { cn } from "@/lib/cn";

export interface CheckItem {
	id: string;
	label: ReactNode;
	/** Shown greyed with a reason rather than hidden, so the limit explains itself. */
	blocked?: boolean;
	blockedNote?: string;
}

/**
 * The scrolling list of checkboxes both pickers are built from: the ignored-channel list and the role list are
 * the same control over different items.
 */
export function CheckList({
	label,
	hint,
	items,
	value,
	max,
	onChange,
}: {
	label: string;
	hint?: string;
	items: CheckItem[];
	value: string[];
	max: number;
	onChange: (ids: string[]) => void;
}): React.JSX.Element {
	const atLimit = value.length >= max;

	return (
		<fieldset>
			<legend className={LABEL}>{label}</legend>
			{hint !== undefined && <p className="text-muted-foreground text-xs">{hint}</p>}
			<p className="text-muted-foreground mt-1 text-xs tabular-nums" aria-live="polite">
				{value.length} of {max} chosen
			</p>

			<div className={SCROLL_LIST}>
				{items.map((item) => {
					const checked = value.includes(item.id);
					const disabled = item.blocked === true || (atLimit && !checked);

					return (
						<label key={item.id} className={cn(CHECK_ROW, disabled ? "opacity-50" : "hover:bg-muted cursor-pointer")}>
							<input
								type="checkbox"
								checked={checked}
								disabled={disabled}
								onChange={() => {
									onChange(checked ? value.filter((id) => id !== item.id) : [...value, item.id]);
								}}
							/>
							<span className="min-w-0 truncate">{item.label}</span>
							{item.blocked === true && item.blockedNote !== undefined && (
								<span className="text-muted-foreground ml-auto shrink-0 text-xs">{item.blockedNote}</span>
							)}
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}
