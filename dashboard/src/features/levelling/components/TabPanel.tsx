import { type ReactNode } from "react";
import { SavingIndicator, type SavingState } from "@/components/form";
import { Card, Eyebrow } from "@/components/primitives";
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
				<Eyebrow as="h2">{title}</Eyebrow>
				<SavingIndicator state={saving} />
			</div>
			{description !== undefined && <p className="text-muted-foreground text-sm">{description}</p>}
			{children}
		</Card>
	);
}
