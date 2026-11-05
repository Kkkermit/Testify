import { type ReactNode, useId } from "react";
import { FIELD_GROUP, LABEL } from "@/components/form/fieldStyles";
import { ROW_GRID, ROW_LABEL, useRowLayout } from "@/components/form/rowLayout";

/** A name over several controls, such as a set of radio cards; a `<fieldset>` cannot be laid out as a row's grid. */
export function FieldGroup({
	label,
	hint,
	children,
}: {
	label: string;
	hint?: string;
	children: ReactNode;
}): React.JSX.Element {
	const row = useRowLayout();
	const id = useId();

	return (
		<div role="group" aria-labelledby={id} className={row ? ROW_GRID : FIELD_GROUP}>
			<span className="flex flex-col gap-1">
				<span id={id} className={row ? ROW_LABEL : LABEL}>
					{label}
				</span>
				{hint !== undefined && <span className="text-muted-foreground text-xs">{hint}</span>}
			</span>
			<div className="flex min-w-0 flex-col gap-2 md:max-w-md">{children}</div>
		</div>
	);
}
