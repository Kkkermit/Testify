import { type ReactNode } from "react";
import { SavingIndicator, type SavingState } from "@/components/form";
import { Card } from "@/components/primitives";
import { cn } from "@/lib/cn";

/** The card, its heading and its saving indicator, which all four tabs had written out identically. */
export function TabPanel({
	title,
	description,
	saving,
	className,
	children,
}: {
	title: string;
	description?: string;
	saving: SavingState;
	className?: string;
	children: ReactNode;
}): React.JSX.Element {
	return (
		<Card className={cn("motion-pop flex flex-col gap-4", className)}>
			<div className="flex items-center justify-between gap-3">
				<h2 className="text-muted-foreground flex items-center gap-2.5 font-mono text-[0.6875rem] tracking-[0.18em] uppercase before:bg-accent/70 before:h-px before:w-5 before:shrink-0 before:content-['']">
					{title}
				</h2>
				<SavingIndicator state={saving} />
			</div>
			{description !== undefined && <p className="text-muted-foreground text-sm">{description}</p>}
			{children}
		</Card>
	);
}
