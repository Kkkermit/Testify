import { type ReactNode } from "react";
import { SavingIndicator, type SavingState } from "@/components/form";
import { Card } from "@/components/primitives";
import { cn } from "@/lib/cn";

/** The card and its saving indicator; no heading, because the tab above already names the panel. */
export function TabPanel({
	description,
	saving,
	className,
	children,
}: {
	description?: string;
	saving: SavingState;
	className?: string;
	children: ReactNode;
}): React.JSX.Element {
	return (
		<Card className={cn("motion-pop flex flex-col gap-4", className)}>
			{/* Not an empty row when there is no description: it would still take the column's gap. */}
			<div
				className={cn("flex items-start gap-3", description === undefined ? "justify-end" : "justify-between")}
				hidden={description === undefined && saving === "idle"}
			>
				{description !== undefined && <p className="text-muted-foreground text-sm">{description}</p>}
				<SavingIndicator state={saving} />
			</div>
			{children}
		</Card>
	);
}
