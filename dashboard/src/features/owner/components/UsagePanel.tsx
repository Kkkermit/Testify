import { Card, CARD_HEADING } from "@/components/primitives";
import { cn } from "@/lib/cn";

/** One titled list on the usage tab; `wide` spans both columns, for the odd one out of a two-column grid. */
export function UsagePanel({
	title,
	hint,
	wide = false,
	children,
}: {
	title: string;
	hint: string;
	wide?: boolean;
	children: React.ReactNode;
}): React.JSX.Element {
	return (
		<Card className={cn("flex flex-col gap-3", wide && "lg:col-span-2")}>
			<div>
				<h2 className={CARD_HEADING}>{title}</h2>
				<p className="text-muted-foreground text-xs">{hint}</p>
			</div>
			{children}
		</Card>
	);
}
