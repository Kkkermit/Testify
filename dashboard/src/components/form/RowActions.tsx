import { type ReactNode } from "react";
import { ROW_GRID, useRowLayout } from "@/components/form/rowLayout";

/** With nothing above to line up under, alone in the panel or straight after its heading, the buttons centre. */
// Written out whole, because Tailwind generates only the classes it finds spelled out in the source.
const ALONE = [
	"[&:only-child]:flex [&:only-child]:flex-row [&:only-child]:justify-center [&:only-child>span]:hidden",
	"[[data-panel-head]+&:last-child]:flex [[data-panel-head]+&:last-child]:flex-row",
	"[[data-panel-head]+&:last-child]:justify-center [[data-panel-head]+&:last-child>span]:hidden",
].join(" ");

export function RowActions({ children }: { children: ReactNode }): React.JSX.Element {
	const row = useRowLayout();
	const buttons = <div className="flex flex-wrap items-center gap-2">{children}</div>;
	if (!row) return buttons;

	return (
		<div className={`${ROW_GRID} ${ALONE}`}>
			<span aria-hidden="true" className="hidden md:block" />
			{buttons}
		</div>
	);
}
