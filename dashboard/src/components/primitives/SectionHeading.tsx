import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SectionHeading({
	children,
	count,
	as: Tag = "p",
	id,
	className,
}: {
	children: ReactNode;
	count?: ReactNode;
	as?: "p" | "h2" | "h3" | "span";
	id?: string;
	className?: string;
}): React.JSX.Element {
	return (
		<Tag id={id} className={cn("text-foreground flex items-baseline gap-2 text-sm font-semibold", className)}>
			{children}
			{count !== undefined && <span className="text-muted-foreground font-normal tabular-nums">{count}</span>}
		</Tag>
	);
}
