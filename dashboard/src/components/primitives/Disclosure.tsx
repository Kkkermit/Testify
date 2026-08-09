import { ChevronDown } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A named, foldable group of cards, open unless a caller says otherwise — the fold is for the reader who wants it. */
export function Disclosure({
	label,
	children,
	defaultOpen = true,
	className,
}: {
	label: string;
	children: ReactNode;
	defaultOpen?: boolean;
	className?: string;
}): React.JSX.Element {
	return (
		<details open={defaultOpen} className={cn("group", className)}>
			<summary className="marker:content-none flex cursor-pointer list-none items-center gap-2.5 py-1 select-none">
				<span aria-hidden="true" className="bg-accent/70 h-px w-5 shrink-0" />
				<span className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.18em] uppercase">{label}</span>
				<ChevronDown
					size={14}
					aria-hidden="true"
					className="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-180"
				/>
			</summary>

			<div className="mt-3">{children}</div>
		</details>
	);
}
