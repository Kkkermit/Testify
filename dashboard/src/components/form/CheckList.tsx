import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CHECK_ROW, FIELD_GROUP, LABEL, SCROLL_LIST } from "@/components/form/fieldStyles";
import { ROW_GRID, ROW_LABEL, useRowLayout } from "@/components/form/rowLayout";
import { cn } from "@/lib/cn";

export interface CheckItem {
	id: string;
	label: ReactNode;
	blocked?: boolean;
	blockedNote?: string;
}

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
	const { t } = useTranslation();
	const atLimit = value.length >= max;
	const nameId = `checklist-${useId()}`;
	const row = useRowLayout();

	// Not a `<fieldset>`: a `<legend>` is not a flex item, so the gap would be lost.
	return (
		<div role="group" aria-labelledby={nameId} className={row ? ROW_GRID : FIELD_GROUP}>
			<span className="flex flex-col gap-1">
				<span id={nameId} className={row ? ROW_LABEL : LABEL}>
					{label}
				</span>
				{hint !== undefined && <span className="text-muted-foreground text-xs">{hint}</span>}
				<span className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
					{t("common.chosen", { count: value.length, max })}
				</span>
			</span>

			<div className={cn(SCROLL_LIST, row && "min-w-0 md:max-w-md")}>
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
		</div>
	);
}
