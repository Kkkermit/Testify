import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Figures across a card, divided by hairlines: two a row on a phone, `columns` a row from `sm`. */
export function FigureStrip({ columns = 4, children }: { columns?: 3 | 4; children: ReactNode }): React.JSX.Element {
	return (
		<dl
			className={cn(
				"grid grid-cols-2 divide-x divide-y sm:divide-y-0 [&>*]:border-border [&>*]:px-6 [&>*]:py-4",
				columns === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3",
			)}
		>
			{children}
		</dl>
	);
}
