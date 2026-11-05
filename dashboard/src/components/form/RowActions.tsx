import { type ReactNode } from "react";
import { ROW_GRID, useRowLayout } from "@/components/form/rowLayout";

export function RowActions({ children }: { children: ReactNode }): React.JSX.Element {
	const row = useRowLayout();
	const buttons = <div className="flex flex-wrap items-center gap-2">{children}</div>;
	if (!row) return buttons;

	return (
		<div className={ROW_GRID}>
			<span aria-hidden="true" className="hidden md:block" />
			{buttons}
		</div>
	);
}
