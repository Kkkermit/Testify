import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A short rule, then a letterspaced mono label — the boot banner's section header, in HTML.
 *
 * The bot already prints one of these on every start (`bannerLines()` in `src/lib/banner.util.ts`, with its
 * heavy `═` and thin `─` rules); the dashboard used to ignore that vernacular entirely. It names which
 * subsystem a block of the page belongs to, so it encodes something true rather than decorating.
 */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }): React.JSX.Element {
	return (
		<p
			className={cn(
				"text-muted-foreground flex items-center gap-2.5 font-mono text-[0.6875rem] tracking-[0.18em] uppercase",
				className,
			)}
		>
			<span aria-hidden="true" className="bg-accent/70 h-px w-5 shrink-0" />
			{children}
		</p>
	);
}
