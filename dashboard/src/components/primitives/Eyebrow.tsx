import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A short rule, then a letterspaced mono label — the boot banner's section header, in HTML.
 *
 * The bot already prints one of these on every start (`bannerLines()` in `src/lib/banner.util.ts`, with its
 * heavy `═` and thin `─` rules); the dashboard used to ignore that vernacular entirely. It names which
 * subsystem a block of the page belongs to, so it encodes something true rather than decorating.
 */
export function Eyebrow({
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
		<Tag
			id={id}
			className={cn(
				"text-muted-foreground flex items-center gap-2 font-mono text-[0.6875rem] tracking-[0.18em] uppercase",
				className,
			)}
		>
			<span aria-hidden="true" className="bg-accent/70 h-px w-5 shrink-0" />
			{children}
			{/* Kept at the label's own scale, or a two-digit count outweighs the words it is counting. */}
			{count !== undefined && <span className="text-foreground tabular-nums">{count}</span>}
		</Tag>
	);
}
