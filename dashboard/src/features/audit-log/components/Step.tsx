import { type ReactNode } from "react";
import { Card } from "@/components/primitives";
import { cn } from "@/lib/cn";

/**
 * A numbered card, for a page whose parts are read in order. The number is decorative — the heading is what
 * names the section — so it is hidden rather than read out as "1" before every title.
 */
export function Step({
	number,
	title,
	describes,
	action,
	className,
	children,
}: {
	number: number;
	title: string;
	describes: string;
	action?: ReactNode;
	className?: string;
	children: ReactNode;
}): React.JSX.Element {
	const headingId = `step-${String(number)}`;

	return (
		<Card aria-labelledby={headingId} className={cn("flex flex-col gap-4", className)}>
			<div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
				<div className="flex min-w-0 items-start gap-3">
					<span
						aria-hidden="true"
						className="bg-primary/15 text-accent flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-sm"
					>
						{number}
					</span>
					<div className="min-w-0">
						<h2 id={headingId} className="text-base font-semibold">
							{title}
						</h2>
						<p className="text-muted-foreground text-sm">{describes}</p>
					</div>
				</div>
				{action}
			</div>

			{children}
		</Card>
	);
}
