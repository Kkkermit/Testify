import { type ReactNode } from "react";
import { FIELD_GROUP, LABEL } from "@/components/form/fieldStyles";
import { ROW_GRID, ROW_LABEL, useRowLayout } from "@/components/form/rowLayout";
import { cn } from "@/lib/cn";

/** Pass `htmlFor` when the control has its own id; omit it and the control is wrapped. */
export function Field({
	label,
	hint,
	htmlFor,
	className,
	children,
}: {
	label: ReactNode;
	hint?: ReactNode;
	htmlFor?: string;
	className?: string;
	children: ReactNode;
}): React.JSX.Element {
	const row = useRowLayout();
	const group = cn(row ? ROW_GRID : FIELD_GROUP, className);
	const name = (
		<>
			<span className={row ? ROW_LABEL : LABEL}>{label}</span>
			{hint !== undefined && <span className="text-muted-foreground text-xs">{hint}</span>}
		</>
	);

	if (htmlFor !== undefined) {
		return (
			<div className={group}>
				<label htmlFor={htmlFor} className="flex flex-col gap-1">
					{name}
				</label>
				{row ? <div className="flex min-w-0 flex-col gap-2 md:max-w-md">{children}</div> : children}
			</div>
		);
	}

	return (
		<label className={group}>
			<span className="flex flex-col gap-1">{name}</span>
			{row ? <span className="flex min-w-0 flex-col gap-2 md:max-w-md">{children}</span> : children}
		</label>
	);
}
